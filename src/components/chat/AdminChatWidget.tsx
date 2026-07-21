import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

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

export function AdminChatWidget() {
  const { session, profile, isAdmin } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = session?.user.id ?? null;

  // Open handler via global event (from profile menu)
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("indi:open-admin-chat", h);
    return () => window.removeEventListener("indi:open-admin-chat", h);
  }, []);

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
        setUnread(((data ?? []) as Msg[]).filter(m => m.is_from_admin && !m.read_at).length);
      }
    })();

    const channel = supabase
      .channel(`admin_msg_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages", filter: `user_id=eq.${uid}` }, (payload: any) => {
        setMsgs(prev => {
          if (payload.eventType === "INSERT") {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            const next = [...prev, payload.new as Msg];
            if ((payload.new as Msg).is_from_admin) setUnread(u => u + 1);
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

  // Auto-scroll + mark read when open
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (!uid) return;
    const unreadIds = msgs.filter(m => m.is_from_admin && !m.read_at).map(m => m.id);
    if (unreadIds.length > 0) {
      (supabase as any)
        .from("admin_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds)
        .then(() => setUnread(0));
    }
  }, [open, msgs, uid]);

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

  // Admins get a bubble that jumps to their moderation inbox.
  if (isAdmin) {
    return (
      <button
        onClick={() => navigate({ to: "/admin/messages" })}
        aria-label={t("chat.openBubble")}
        title={t("chat.openBubble")}
        className="fixed bottom-40 right-4 z-40 grid size-14 place-items-center rounded-full border-2 border-black bg-primary text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
      >
        <MessageCircle className="size-6" />
      </button>
    );
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("chat.openBubble")}
          className="fixed bottom-40 right-4 z-40 grid size-14 place-items-center rounded-full border-2 border-black bg-primary text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
        >
          <MessageCircle className="size-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-black bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-40 right-4 z-40 flex h-[70vh] max-h-[540px] w-[92vw] max-w-sm flex-col rounded-lg border-2 border-black bg-background shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between border-b-2 border-black bg-primary px-3 py-2 text-black">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{t("chat.title")}</div>
              <div className="truncate text-[11px] opacity-80">{t("chat.subtitle")}</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("action.close")} className="grid size-8 place-items-center rounded-md hover:bg-black/10">
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
            ) : msgs.map(m => (
              <div key={m.id} className={cn("flex", m.is_from_admin ? "justify-start" : "justify-end")}>
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
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-end gap-1 border-t-2 border-black p-2"
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