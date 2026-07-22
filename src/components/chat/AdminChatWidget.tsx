import { useEffect, useRef, useState } from "react";
import { X, Send, ImagePlus, Loader2, ArrowDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  user_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  is_from_admin: boolean;
  read_at: string | null;
  created_at: string;
};

const BUCKET = "content-images";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function AdminChatWidget() {
  const { session, isAdmin } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Unread is derived from `msgs` (admin messages with no read_at). Deriving
  // rather than mirroring keeps the badge in sync across tabs automatically:
  // whenever any tab marks messages as read, the resulting UPDATE arrives via
  // Realtime in every other tab, `msgs` refreshes, and the count follows.
  const unread = msgs.filter(m => m.is_from_admin && !m.read_at).length;
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // When the user scrolls up to read older messages we don't want to yank
  // them back down on every new arrival. Track whether we're pinned to the
  // bottom and only auto-scroll then.
  const stickToBottom = useRef(true);
  // Only clear the unread badge after the reader has actively reached the
  // bottom. Opening the widget (or a programmatic auto-scroll) is not
  // enough — the count must persist across refreshes until the user
  // themselves scrolls / taps to the latest message.
  const userInteracted = useRef(false);
  // Rendered pill state: true whenever the reader is scrolled up.
  // The button stays visible so the user can always jump back to the
  // latest message and mark the thread as read in one tap.
  const [showJump, setShowJump] = useState(false);
  const uid = session?.user.id ?? null;
  const reducedMotion = usePrefersReducedMotion();
  // localStorage key for the persisted scroll offset. Scoped per-user so
  // switching accounts on the same device doesn't leak positions.
  const scrollKey = uid ? `indi.chat.scroll.${uid}` : null;
  // Set once we've applied the saved offset for the current thread, so
  // subsequent renders don't fight the user's manual scrolling.
  const scrollRestored = useRef(false);
  // Track the previous user id so we can wipe per-user local state when the
  // account changes or the user signs out.
  const lastUidRef = useRef<string | null>(null);
  // Live browser Notification objects we spawned for unread admin messages.
  // Kept so we can `close()` them the moment the reader marks the thread as
  // read (in this tab or another one via Realtime), keeping the OS badge in
  // sync with the in-app counter.
  const liveNotifications = useRef<Notification[]>([]);
  // IntersectionObserver that watches unread admin bubbles inside the
  // scroll container. When a bubble is actually revealed in the viewport
  // (any scroll — wheel, drag, keyboard, programmatic — or a resize that
  // uncovers it), we mark that specific message as read. This keeps the
  // badge honest without requiring the reader to reach the very bottom.
  const visibilityObserver = useRef<IntersectionObserver | null>(null);

  // Open handler via global event (from profile menu / MiniPlayer trigger).
  // We also listen on `document` because some environments (older WebViews,
  // strict CSP) intermittently drop bubbled window events dispatched from
  // deeply nested components.
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("indi:open-admin-chat", h);
    document.addEventListener("indi:open-admin-chat", h);
    // Expose an imperative fallback so the trigger can force-open even if
    // event dispatch fails (e.g. iframe boundaries, native shell).
    (window as any).__indiOpenAdminChat = () => setOpen(true);
    return () => {
      window.removeEventListener("indi:open-admin-chat", h);
      document.removeEventListener("indi:open-admin-chat", h);
      if ((window as any).__indiOpenAdminChat) delete (window as any).__indiOpenAdminChat;
    };
  }, []);

  // Ask for browser Notification permission the first time the widget
  // mounts for a signed-in user. Silently no-ops on unsupported platforms
  // (iOS Safari non-PWA, older WebViews) and when the user already
  // decided (granted/denied).
  useEffect(() => {
    if (!uid) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { Notification.requestPermission().catch(() => {}); } catch { /* noop */ }
    }
  }, [uid]);

  // Close every system notification we opened. Called when the reader
  // reaches the bottom, hits "Mark as read", or when another tab updates
  // `read_at` via Realtime (unread drops to 0).
  function closeSystemNotifications() {
    for (const n of liveNotifications.current) {
      try { n.close(); } catch { /* noop */ }
    }
    liveNotifications.current = [];
  }

  // Whenever the derived unread count returns to zero, tear down any
  // lingering OS notifications so the badge in the tray matches the app.
  useEffect(() => {
    if (unread === 0) closeSystemNotifications();
  }, [unread]);

  // Close notifications on unmount to avoid stale entries.
  useEffect(() => () => closeSystemNotifications(), []);

  // Load thread + subscribe
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("admin_messages")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMsgs((data ?? []) as Msg[]);
      }
    })();

    const channel = supabase
      .channel(`admin_msg_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages", filter: `user_id=eq.${uid}` }, (payload: any) => {
        setMsgs(prev => {
          if (payload.eventType === "INSERT") {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            const next = [...prev, payload.new as Msg];
            const isAdminMsg = (payload.new as Msg).is_from_admin;
            // If the widget is open but scrolled up, surface the
            // jump-to-latest pill as well.
            if (isAdminMsg && open && !stickToBottom.current) {
              setShowJump(true);
            }
            // Fire an OS notification when the user isn't actively
            // reading this thread: chat closed, tab hidden, or scrolled
            // away from the bottom. The `tag` collapses repeats into a
            // single tray entry so we don't spam the notification centre.
            if (isAdminMsg && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              const shouldNotify = !open || document.visibilityState === "hidden" || !stickToBottom.current;
              if (shouldNotify) {
                try {
                  const msg = payload.new as Msg;
                  const body = msg.body?.trim() || (msg.image_url ? "📷" : "…");
                  const n = new Notification(t("chat.notifTitle"), {
                    body,
                    tag: "indi-admin-chat",
                    icon: "/favicon.ico",
                    silent: false,
                  });
                  n.onclick = () => {
                    try { window.focus(); } catch { /* noop */ }
                    setOpen(true);
                    n.close();
                  };
                  liveNotifications.current.push(n);
                } catch { /* noop */ }
              }
            }
            return next;
          }
          if (payload.eventType === "UPDATE") {
            return prev.map(m => m.id === payload.new.id ? (payload.new as Msg) : m);
          }
          return prev;
        });
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [uid]);

  // Auto-scroll to the latest message + mark unread as read when open.
  // Runs whenever `msgs` changes (initial load, realtime INSERT, own send).
  useEffect(() => {
    if (!open) return;
    if (stickToBottom.current && scrollRestored.current) {
      // Defer to the next frame so the newly rendered bubble is measured
      // before we scroll — otherwise `scrollHeight` still reflects the old DOM.
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    if (!uid) return;
    // Mark as read only when the reader has actively reached the bottom.
    // On open we auto-scroll for convenience, but the unread count stays
    // (and survives a page refresh, since it's derived from `read_at`)
    // until the user scrolls / taps to the latest message themselves.
    if (!stickToBottom.current || !userInteracted.current) return;
    markVisibleAsRead();
  }, [open, msgs, uid]);

  // Snap to bottom on open, regardless of previous scroll position.
  useEffect(() => {
    if (!open) return;
    // Restore the saved offset if we have one; otherwise fall back to the
    // bottom. Restoration waits for the first `msgs` batch so the scroll
    // container has real height to work with.
    scrollRestored.current = false;
    setShowJump(false);
    userInteracted.current = false;
    const saved = scrollKey ? Number(localStorage.getItem(scrollKey) ?? "NaN") : NaN;
    const hasSaved = Number.isFinite(saved) && saved >= 0;
    stickToBottom.current = !hasSaved;
    const tryRestore = () => {
      const el = scrollRef.current;
      if (!el) return false;
      if (hasSaved) {
        el.scrollTop = saved;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottom.current = distanceFromBottom < 80;
      } else {
        scrollToBottom();
      }
      scrollRestored.current = true;
      return true;
    };
    // Retry across a few frames until the first message batch has mounted.
    let attempts = 0;
    const tick = () => {
      if (tryRestore() || attempts++ > 20) return;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [open]);

  // Detect whether the reader is near the bottom; if not, pause auto-scroll
  // so incoming messages don't interrupt reading older ones.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottom.current = atBottom;
    // Persist the offset so the next visit (even after a hard refresh)
    // reopens the chat at the same reading point. Skip while we're still
    // restoring, otherwise the initial programmatic scroll would overwrite
    // the saved value with the bottom.
    if (scrollKey && scrollRestored.current) {
      if (atBottom) localStorage.removeItem(scrollKey);
      else localStorage.setItem(scrollKey, String(el.scrollTop));
    }
    if (scrollRestored.current) {
      setShowJump(!atBottom);
    }
    if (atBottom && userInteracted.current) {
      markVisibleAsRead();
    }
  }

  // Smooth scroll to the latest message, but respect the user's reduced
  // motion preference so accessibility settings remain honoured.
  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }

  function jumpToLatest() {
    stickToBottom.current = true;
    userInteracted.current = true;
    setShowJump(false);
    if (scrollKey) localStorage.removeItem(scrollKey);
    scrollToBottom();
    markVisibleAsRead();
  }

  // Explicit "Mark as read" action: immediately mark every unread admin
  // message as read, reset the badge and clear the persisted scroll key.
  function forceMarkAsRead() {
    if (!uid) return;
    const unreadIds = msgs.filter(m => m.is_from_admin && !m.read_at).map(m => m.id);
    if (unreadIds.length === 0) return;
    const nowIso = new Date().toISOString();
    setMsgs(prev => prev.map(m => (unreadIds.includes(m.id) ? { ...m, read_at: nowIso } : m)));
    setShowJump(false);
    if (scrollKey) localStorage.removeItem(scrollKey);
    (supabase as any)
      .from("admin_messages")
      .update({ read_at: nowIso })
      .in("id", unreadIds)
      .then(() => {});
  }

  // Flip the "user scrolled themselves" flag on any real input gesture
  // inside the scroll container. Programmatic `scrollIntoView` fires
  // scroll events too, so we can't rely on `onScroll` alone.
  function markUserInteracted() {
    userInteracted.current = true;
  }

  // Persist read state in DB so the unread badge survives refreshes.
  function markVisibleAsRead() {
    if (!uid) return;
    const unreadIds = msgs.filter(m => m.is_from_admin && !m.read_at).map(m => m.id);
    if (unreadIds.length === 0) return;
    const nowIso = new Date().toISOString();
    // Optimistically flip `read_at` locally so the badge drops immediately
    // in this tab; the Realtime UPDATE propagates the same change to other
    // tabs, keeping the derived unread count aligned everywhere.
    setMsgs(prev => prev.map(m => (unreadIds.includes(m.id) ? { ...m, read_at: nowIso } : m)));
    (supabase as any)
      .from("admin_messages")
      .update({ read_at: nowIso })
      .in("id", unreadIds)
      .then(() => {});
  }

  // Mark a specific set of admin message IDs as read (used by the
  // IntersectionObserver when bubbles enter the viewport).
  function markIdsAsRead(ids: string[]) {
    if (!uid || ids.length === 0) return;
    const nowIso = new Date().toISOString();
    setMsgs(prev => prev.map(m => (ids.includes(m.id) ? { ...m, read_at: nowIso } : m)));
    (supabase as any)
      .from("admin_messages")
      .update({ read_at: nowIso })
      .in("id", ids)
      .then(() => {});
  }

  // (Re)build the IntersectionObserver whenever the chat opens or the
  // message list changes, so freshly rendered bubbles are observed too.
  useEffect(() => {
    if (!open || !uid) return;
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        const seen: string[] = [];
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.msgId;
          if (id) seen.push(id);
          obs.unobserve(e.target);
        }
        if (seen.length) markIdsAsRead(seen);
      },
      { root, threshold: 0.6 },
    );
    visibilityObserver.current = obs;

    const nodes = root.querySelectorAll<HTMLElement>('[data-msg-id][data-unread="1"]');
    nodes.forEach(n => obs.observe(n));

    return () => {
      obs.disconnect();
      visibilityObserver.current = null;
    };
  }, [open, uid, msgs]);

  // Broadcast unread count so external UI (e.g. the MiniPlayer chat
  // trigger) can render its own badge without duplicating state.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("indi:admin-chat-unread", { detail: unread }));
  }, [unread]);

  async function sendMessage(imageUrl?: string) {
    if (!uid) return;
    const body = text.trim();
    if (!body && !imageUrl) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("admin_messages").insert({
        user_id: uid, sender_id: uid, body: body || null, image_url: imageUrl ?? null, is_from_admin: false,
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function handleFile(f: File) {
    if (!uid) return;
    if (!f.type.startsWith("image/")) { toast.error("Image uniquement"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10 Mo"); return; }
    setSending(true);
    try {
      const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `admin-chat/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      await sendMessage(signed.signedUrl);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload impossible");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!session) return null;

  // Admins have no user-facing panel; the trigger in MiniPlayer navigates them to /admin/messages.
  if (isAdmin) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-2 z-50 flex flex-col rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000] sm:inset-auto sm:right-4 sm:top-auto sm:w-[92vw] sm:max-w-sm"
          style={{
            // Dynamic viewport units (`dvh`) shrink with mobile browser
            // chrome, so the panel always fits between the header (~4rem)
            // and the MiniPlayer + legal footer (~13rem on mobile /
            // ~14rem on desktop). `min()` caps the desktop panel at a
            // comfortable reading height without ever spilling off-screen.
            //
            // iOS safe-area insets (notch / home indicator / status bar)
            // are added so the panel never slides under system chrome
            // when the app runs standalone (PWA / Capacitor WebView).
            top: "calc(4rem + env(safe-area-inset-top, 0px))",
            bottom: "calc(13rem + env(safe-area-inset-bottom, 0px))",
            height:
              "min(calc(100dvh - 4rem - 13rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)), 540px)",
            maxHeight:
              "calc(100dvh - 4rem - 13rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex items-center justify-between border-b-2 border-black bg-primary px-3 py-2 text-black">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-bold">{t("chat.title")}</div>
                {unread > 0 && (
                  <span
                    aria-label={`${unread} ${t("chat.unread")}`}
                    className="grid min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-bold text-primary"
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={forceMarkAsRead}
                  aria-label={t("chat.markRead")}
                  className="mt-0.5 flex w-fit items-center gap-1 rounded border-2 border-black bg-black px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-black/80"
                >
                  <Check className="size-3" />
                  {t("chat.markRead")}
                </button>
              )}

              <div className="truncate text-[11px] opacity-80">{t("chat.subtitle")}</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("action.close")} className="grid size-8 place-items-center rounded-md hover:bg-black/10">
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onWheel={markUserInteracted}
            onTouchStart={markUserInteracted}
            onPointerDown={markUserInteracted}
            onKeyDown={markUserInteracted}
            className="flex-1 space-y-2 overflow-y-auto p-3"
          >
            {msgs.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
            ) : msgs.map(m => (
              <div
                key={m.id}
                data-msg-id={m.id}
                data-unread={m.is_from_admin && !m.read_at ? "1" : "0"}
                className={cn("flex", m.is_from_admin ? "justify-start" : "justify-end")}
              >
                <div className={cn(
                  "max-w-[80%] rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[2px_2px_0_0_#000]",
                  m.is_from_admin ? "bg-muted text-foreground" : "bg-primary text-black"
                )}>
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      <img src={m.image_url} alt="" className="mb-1 max-h-48 rounded" />
                    </a>
                  )}
                  {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  <div className="mt-1 text-[10px] opacity-70">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} aria-hidden="true" />
          </div>

          {showJump && (
            <button
              type="button"
              onClick={jumpToLatest}
              aria-label={t("chat.jumpToLatest")}
              className="pointer-events-auto absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-black bg-primary px-3 py-1.5 text-xs font-semibold text-black shadow-[2px_2px_0_0_#000] hover:bg-primary/90"
              style={{ bottom: "calc(6.25rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <ArrowDown className="size-3.5" />
              {t("chat.jumpToLatest")}
              {unread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-bold text-primary">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          )}

          {/* Mobile close affordance: always visible above the composer so the
              user can exit the chat and return to the player instantly. */}
          <div
            className="sticky bottom-0 z-10 border-t-2 border-black bg-background px-2 py-1.5 sm:hidden"
            style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label={t("action.close")}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-sm font-semibold text-black shadow-[2px_2px_0_0_#000]"
            >
              <X className="size-4" />
              {t("chat.closeMobile")}
            </button>
          </div>

          <form

            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-end gap-1 border-t-2 border-black p-2"
            style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              aria-label={t("chat.image")}
              className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-black bg-background hover:bg-muted"
            >
              <ImagePlus className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={t("chat.placeholder")}
              rows={1}
              className="max-h-24 min-h-9 flex-1 resize-none rounded-md border-2 border-black bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || (!text.trim())}
              aria-label={t("chat.send")}
              className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function openAdminChat() {
  window.dispatchEvent(new Event("indi:open-admin-chat"));
}