import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, ImagePlus, Loader2, ArrowLeft, Bell, BellOff } from "lucide-react";
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

type Thread = {
  user_id: string;
  pseudo: string | null;
  last_at: string;
  last_preview: string;
  unread: number;
};

const BUCKET = "content-images";

/**
 * Floating yellow chat panel for admins. Mirrors the user-side widget
 * (same positioning between header and MiniPlayer) but shows the list
 * of listener threads and lets the admin reply in place. Opens via the
 * global `indi:open-admin-chat` event dispatched by the MiniPlayer chat
 * trigger, so admins and users share the same entry point.
 */
export function AdminChatAdminPanel() {
  const { session, isAdmin } = useAuth();
  const t = useT();
  const adminId = session?.user.id ?? null;
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalUnread = threads.reduce((n, th) => n + th.unread, 0);

  // OS notification preference (per-admin-uid).
  const notifKey = adminId ? `indi.chat.notif.${adminId}` : null;
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const notifEnabledRef = useRef(true);
  useEffect(() => { notifEnabledRef.current = notifEnabled; }, [notifEnabled]);
  const liveNotifications = useRef<Notification[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
    if (!notifKey) return;
    const saved = localStorage.getItem(notifKey);
    setNotifEnabled(saved === null ? true : saved === "1");
  }, [notifKey]);

  function closeSystemNotifications() {
    for (const n of liveNotifications.current) {
      try { n.close(); } catch { /* noop */ }
    }
    liveNotifications.current = [];
  }

  async function toggleNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (notifEnabled) {
      setNotifEnabled(false);
      if (notifKey) localStorage.setItem(notifKey, "0");
      closeSystemNotifications();
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") {
      try { perm = await Notification.requestPermission(); } catch { /* noop */ }
    }
    setNotifPermission(perm);
    if (perm !== "granted") return;
    setNotifEnabled(true);
    if (notifKey) localStorage.setItem(notifKey, "1");
  }

  // Global open trigger. We listen on both window and document because
  // some WebViews drop bubbled window events on first mount.
  useEffect(() => {
    if (!isAdmin) return;
    const h = () => setOpen(true);
    window.addEventListener("indi:open-admin-chat", h);
    document.addEventListener("indi:open-admin-chat", h);
    (window as any).__indiOpenAdminChat = () => setOpen(true);
    return () => {
      window.removeEventListener("indi:open-admin-chat", h);
      document.removeEventListener("indi:open-admin-chat", h);
      if ((window as any).__indiOpenAdminChat) delete (window as any).__indiOpenAdminChat;
    };
  }, [isAdmin]);

  async function loadThreads() {
    const { data } = await (supabase as any)
      .from("admin_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return;
    const map = new Map<string, Msg[]>();
    for (const m of data as Msg[]) {
      const arr = map.get(m.user_id) ?? [];
      arr.push(m);
      map.set(m.user_id, arr);
    }
    const uids = Array.from(map.keys());
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profs ?? []).map((p) => [p.id, p.pseudo]));
    const list: Thread[] = uids.map((uid) => {
      const arr = map.get(uid)!;
      const last = arr[0];
      const unread = arr.filter((m) => !m.is_from_admin && !m.read_at).length;
      return {
        user_id: uid,
        pseudo: pmap.get(uid) ?? null,
        last_at: last.created_at,
        last_preview: last.body?.slice(0, 80) ?? (last.image_url ? "[image]" : ""),
        unread,
      };
    }).sort((a, b) => b.last_at.localeCompare(a.last_at));
    setThreads(list);
  }

  async function loadThread(uid: string) {
    const { data } = await (supabase as any)
      .from("admin_messages")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    const unread = ((data ?? []) as Msg[]).filter((m) => !m.is_from_admin && !m.read_at).map((m) => m.id);
    if (unread.length) {
      await (supabase as any)
        .from("admin_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread);
      loadThreads();
    }
  }

  // Realtime feed for all admin_messages. Refreshes the thread list and
  // (if a conversation is open) the visible messages, plus fires an OS
  // notification for new listener messages.
  useEffect(() => {
    if (!isAdmin) return;
    loadThreads();
    const ch = supabase
      .channel("admin_chat_panel_all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_messages" },
        (payload: any) => {
          loadThreads();
          if (selected) loadThread(selected);
          if (payload.eventType === "INSERT") {
            const m = payload.new as Msg;
            if (!m.is_from_admin && notifEnabledRef.current && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                const body = m.body?.trim() || (m.image_url ? "📷" : "…");
                const n = new Notification(t("chat.notifTitle"), {
                  body,
                  tag: `indi-admin-chat-${m.user_id}`,
                  icon: "/favicon.ico",
                  silent: false,
                });
                n.onclick = () => {
                  try { window.focus(); } catch { /* noop */ }
                  setOpen(true);
                  setSelected(m.user_id);
                  n.close();
                };
                liveNotifications.current.push(n);
              } catch { /* noop */ }
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selected]);

  useEffect(() => {
    if (selected) loadThread(selected);
    else setMsgs([]);
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (totalUnread === 0) closeSystemNotifications();
  }, [totalUnread]);

  useEffect(() => () => closeSystemNotifications(), []);

  async function reply(imageUrl?: string) {
    if (!selected || !adminId) return;
    const body = text.trim();
    if (!body && !imageUrl) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("admin_messages").insert({
        user_id: selected,
        sender_id: adminId,
        body: body || null,
        image_url: imageUrl ?? null,
        is_from_admin: true,
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
    if (!adminId || !selected) return;
    if (!f.type.startsWith("image/")) { toast.error("Image uniquement"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10 Mo"); return; }
    setSending(true);
    try {
      const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `admin-chat/${selected}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
        cacheControl: "3600", upsert: false, contentType: f.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      await reply(signed.signedUrl);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload impossible");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const selectedThread = useMemo(
    () => threads.find((th) => th.user_id === selected),
    [threads, selected]
  );

  if (!session || !isAdmin) return null;
  if (!open) return null;

  return (
    <div
      className="fixed inset-x-2 z-50 flex flex-col rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000] sm:inset-auto sm:right-4 sm:top-auto sm:w-[92vw] sm:max-w-sm"
      style={{
        top: "calc(4rem + env(safe-area-inset-top, 0px))",
        bottom: "calc(13rem + env(safe-area-inset-bottom, 0px))",
        height:
          "min(calc(100dvh - 4rem - 13rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)), 540px)",
        maxHeight:
          "calc(100dvh - 4rem - 13rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex items-center justify-between border-b-2 border-black bg-primary px-3 py-2 text-black">
        <div className="flex min-w-0 items-center gap-2">
          {selected && (
            <button
              onClick={() => setSelected(null)}
              aria-label="Retour"
              className="grid size-7 place-items-center rounded-md hover:bg-black/10"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-bold">
                {selected ? `@${selectedThread?.pseudo ?? selected.slice(0, 8)}` : t("chat.title")}
              </div>
              {!selected && totalUnread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-bold text-primary">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div className="truncate text-[11px] opacity-80">
              {selected ? "Réponse en direct" : "Fils des auditeurs"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {notifPermission !== "unsupported" && (
            <button
              onClick={toggleNotifications}
              aria-label={notifEnabled ? t("chat.notifDisable") : t("chat.notifEnable")}
              disabled={notifPermission === "denied"}
              className="grid size-8 place-items-center rounded-md hover:bg-black/10 disabled:opacity-50"
            >
              {notifEnabled && notifPermission === "granted"
                ? <Bell className="size-4" />
                : <BellOff className="size-4" />}
            </button>
          )}
          <button onClick={() => setOpen(false)} aria-label={t("action.close")} className="grid size-8 place-items-center rounded-md hover:bg-black/10">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {threads.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Aucun message.</p>
          )}
          {threads.map((th) => (
            <button
              key={th.user_id}
              onClick={() => setSelected(th.user_id)}
              className="flex w-full items-start justify-between gap-2 rounded-md border-2 border-black bg-background px-2 py-2 text-left text-sm shadow-[2px_2px_0_0_#000] hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-semibold">
                  @{th.pseudo ?? th.user_id.slice(0, 8)}
                  {th.unread > 0 && (
                    <span className="ml-auto grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {th.unread > 9 ? "9+" : th.unread}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">{th.last_preview}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.is_from_admin ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[2px_2px_0_0_#000]",
                  m.is_from_admin ? "bg-primary text-black" : "bg-muted text-foreground"
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
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); reply(); }}
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
              placeholder="Réponse à l'auditeur…"
              rows={1}
              className="max-h-24 min-h-9 flex-1 resize-none rounded-md border-2 border-black bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label={t("chat.send")}
              className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}