import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ShieldAlert, Send, Loader2, ImagePlus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({ meta: [{ title: "Messages — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminMessagesPage,
});

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

function AdminMessagesPage() {
  const { isAdmin, session } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const adminId = session?.user.id;

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
    const { data: profs } = await supabase.from("profiles").select("id, pseudo").in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profs ?? []).map(p => [p.id, p.pseudo]));
    const list: Thread[] = uids.map(uid => {
      const arr = map.get(uid)!;
      const last = arr[0];
      const unread = arr.filter(m => !m.is_from_admin && !m.read_at).length;
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

  useEffect(() => {
    if (!isAdmin) return;
    loadThreads();
    const ch = supabase
      .channel("admin_all_msgs")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, () => {
        loadThreads();
        if (selected) loadThread(selected);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selected]);

  async function loadThread(uid: string) {
    const { data } = await (supabase as any)
      .from("admin_messages")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    // Mark unread from user as read
    const unread = ((data ?? []) as Msg[]).filter(m => !m.is_from_admin && !m.read_at).map(m => m.id);
    if (unread.length) {
      await (supabase as any).from("admin_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      loadThreads();
    }
  }

  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function reply(imageUrl?: string) {
    if (!selected || !adminId) return;
    const body = text.trim();
    if (!body && !imageUrl) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("admin_messages").insert({
        user_id: selected, sender_id: adminId, body: body || null, image_url: imageUrl ?? null, is_from_admin: true,
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Envoi impossible");
    } finally { setSending(false); }
  }

  async function handleFile(f: File) {
    if (!adminId || !selected) return;
    if (!f.type.startsWith("image/")) { toast.error("Image uniquement"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10 Mo"); return; }
    setSending(true);
    try {
      const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `admin-chat/${selected}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
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

  const selectedThread = useMemo(() => threads.find(t => t.user_id === selected), [threads, selected]);

  if (!isAdmin) {
    return (
      <div className="rounded-lg border-2 border-black p-6 text-center">
        <ShieldAlert className="mx-auto size-8 text-destructive" />
        <p className="mt-2 font-bold">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border-2 border-black bg-background p-2">
        <h2 className="mb-2 flex items-center gap-2 px-2 text-sm font-bold">
          <MessageCircle className="size-4" /> Fils de discussion
        </h2>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {threads.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun message.</p>}
          {threads.map(t => (
            <button
              key={t.user_id}
              onClick={() => setSelected(t.user_id)}
              className={cn(
                "flex w-full items-start justify-between gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm hover:bg-muted",
                selected === t.user_id && "border-black bg-primary/20"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-semibold">
                  @{t.pseudo ?? t.user_id.slice(0, 8)}
                  {t.unread > 0 && (
                    <span className="ml-auto grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {t.unread > 9 ? "9+" : t.unread}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">{t.last_preview}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border-2 border-black bg-background">
        {!selected ? (
          <div className="grid h-[60vh] place-items-center text-sm text-muted-foreground">
            Sélectionne un fil de discussion.
          </div>
        ) : (
          <div className="flex h-[70vh] flex-col">
            <div className="border-b-2 border-black px-3 py-2 font-bold">
              @{selectedThread?.pseudo ?? selected.slice(0, 8)}
            </div>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
              {msgs.map(m => (
                <div key={m.id} className={cn("flex", m.is_from_admin ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-lg border-2 border-black px-3 py-2 text-sm shadow-[2px_2px_0_0_#000]",
                    m.is_from_admin ? "bg-primary text-black" : "bg-muted text-foreground"
                  )}>
                    {m.image_url && <a href={m.image_url} target="_blank" rel="noreferrer"><img src={m.image_url} alt="" className="mb-1 max-h-64 rounded" /></a>}
                    {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                    <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); reply(); }} className="flex items-end gap-1 border-t-2 border-black p-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Image" className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-black bg-background hover:bg-muted">
                <ImagePlus className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
                placeholder="Réponse à l'auditeur…"
                rows={1}
                className="max-h-24 min-h-9 flex-1 resize-none rounded-md border-2 border-black bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" disabled={sending || !text.trim()} aria-label="Envoyer" className="grid size-9 shrink-0 place-items-center rounded-md border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] disabled:opacity-50">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}