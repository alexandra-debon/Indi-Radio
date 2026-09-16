import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { renderRich } from "@/lib/rich-text";
import { useTeeviTxt } from "@/components/teevi/teevi-i18n";

export function TeeviLikeButton({ videoId }: { videoId: string }) {
  const txt = useTeeviTxt();
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id ?? null;

  const { data } = useQuery({
    queryKey: ["teevi-likes", videoId, uid ?? "anon"],
    queryFn: async () => {
      const [{ count }, own] = await Promise.all([
        supabase.from("teevi_likes").select("*", { count: "exact", head: true }).eq("video_id", videoId),
        uid
          ? supabase.from("teevi_likes").select("id").eq("video_id", videoId).eq("user_id", uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { count: count ?? 0, liked: !!own.data };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (data?.liked) {
        const { error } = await supabase
          .from("teevi_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teevi_likes").insert({ video_id: videoId, user_id: uid });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teevi-likes", videoId] }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <button
      type="button"
      onClick={() => requireAuth(() => toggle.mutate())}
      aria-label={data?.liked ? txt.unlike : txt.like}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
        data?.liked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <Heart className={cn("size-3.5", data?.liked && "fill-current")} />
      <span>{data?.count ?? 0}</span>
    </button>
  );
}

interface TeeviComment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  pseudo: string;
}

export function TeeviComments({ videoId }: { videoId: string }) {
  const txt = useTeeviTxt();
  const { session, requireAuth, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const key = ["teevi-comments", videoId];

  const { data: comments = [] } = useQuery<TeeviComment[]>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teevi_comments")
        .select("id, content, author_id, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      let pseudos: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, pseudo").in("id", ids);
        pseudos = Object.fromEntries((profs ?? []).map((p) => [p.id, p.pseudo]));
      }
      return rows.map((r) => ({ ...r, pseudo: pseudos[r.author_id] ?? "auditeur" }));
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!session || !text.trim()) return;
      const { error } = await supabase.from("teevi_comments").insert({
        video_id: videoId,
        author_id: session.user.id,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const edit = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("teevi_comments").update({ content: content.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      setEditText("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teevi_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <section className="space-y-3" data-reply-scope>
      <h2 className="text-sm font-black uppercase tracking-widest">{txt.comments}</h2>
      {session ? (
        <div className="space-y-2" data-reply-composer>
          <MentionTextarea
            rows={2}
            placeholder={txt.commentPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button size="sm" disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>
            {txt.commentPublish}
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => requireAuth(() => {})} className="text-xs text-primary underline">
          {txt.commentSignIn}
        </button>
      )}

      {comments.length === 0 && <p className="text-xs text-muted-foreground">{txt.commentEmpty}</p>}

      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded border border-border p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.pseudo}</span>
              <span className="text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
            {editId === c.id ? (
              <div className="mt-1 space-y-1">
                <Textarea
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editText.trim() || edit.isPending}
                    onClick={() => edit.mutate({ id: c.id, content: editText })}
                  >
                    {txt.save}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    {txt.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap break-words text-foreground/90">
                {renderRich(c.content)}
              </p>
            )}
            <div className="mt-1 flex items-center gap-3">
              {session?.user.id === c.author_id && editId !== c.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditId(c.id);
                    setEditText(c.content);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                >
                  <Pencil className="size-3" /> {txt.commentEdit}
                </button>
              )}
              {(session?.user.id === c.author_id || isAdmin) && (
                <button
                  type="button"
                  onClick={() => del.mutate(c.id)}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" /> {txt.commentDelete}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
