import { useEffect, useState } from "react";
import { Heart, Star, Trash2, Flag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ReportButton } from "@/components/moderation/ReportButton";

type Props = { contentType: string; contentId: string };

export function ContentLikeButton({ contentType, contentId }: Props) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id ?? null;
  const key = ["content-likes", contentType, contentId, uid ?? "anon"];

  useEffect(() => {
    const ch = supabase
      .channel(`clike-${contentType}-${contentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_likes", filter: `content_id=eq.${contentId}` }, () =>
        qc.invalidateQueries({ queryKey: ["content-likes", contentType, contentId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [contentType, contentId, qc]);

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [{ count }, own] = await Promise.all([
        supabase.from("content_likes").select("*", { count: "exact", head: true }).eq("content_type", contentType).eq("content_id", contentId),
        uid
          ? supabase.from("content_likes").select("id").eq("content_type", contentType).eq("content_id", contentId).eq("user_id", uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { count: count ?? 0, liked: !!own.data };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (data?.liked) {
        await supabase.from("content_likes").delete().eq("content_type", contentType).eq("content_id", contentId).eq("user_id", uid);
      } else {
        await supabase.from("content_likes").insert({ content_type: contentType, content_id: contentId, user_id: uid });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-likes", contentType, contentId] }),
  });

  return (
    <button
      onClick={(e) => { e.stopPropagation(); requireAuth(() => toggle.mutate()); }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
        data?.liked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
      aria-label={data?.liked ? "Retirer le j'aime" : "J'aime"}
    >
      <Heart className={cn("size-3.5", data?.liked && "fill-current")} />
      <span>{data?.count ?? 0}</span>
    </button>
  );
}

export function ContentCommentsSection({ contentType, contentId }: Props) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const key = ["content-comments", contentType, contentId];

  useEffect(() => {
    const ch = supabase
      .channel(`ccom-${contentType}-${contentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_comments", filter: `content_id=eq.${contentId}` }, () =>
        qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [contentType, contentId, qc]);

  const { data: comments = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_comments")
        .select("id, body, author_id, created_at, parent_id")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: true })
        .limit(200);
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
    mutationFn: async (opts: { body: string; parentId: string | null }) => {
      if (!session || !opts.body.trim()) return;
      const { error } = await supabase.from("content_comments").insert({
        content_type: contentType,
        content_id: contentId,
        author_id: session.user.id,
        body: opts.body.trim(),
        parent_id: opts.parentId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (vars?.parentId) { setReplyText(""); setReplyTo(null); }
      else { setText(""); }
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const roots = comments.filter((c) => !c.parent_id).slice().reverse();
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const renderComment = (c: typeof comments[number], depth = 0) => (
    <li key={c.id} className={cn("rounded border border-border p-2 text-xs", depth > 0 && "ml-4 mt-2 bg-muted/30")}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{c.pseudo}</span>
        <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-foreground/90">{c.body}</p>
      <div className="mt-1 flex items-center gap-3">
        {session && (
          <button
            onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
            className="text-[10px] text-muted-foreground hover:text-primary"
          >
            Répondre
          </button>
        )}
        {session?.user.id === c.author_id && (
          <button onClick={() => del.mutate(c.id)} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3" /> Supprimer
          </button>
        )}
        {session && session.user.id !== c.author_id && (
          <ReportButton commentType="content_comment" commentId={c.id} />
        )}
      </div>
      {replyTo === c.id && session && (
        <div className="mt-2 space-y-1">
          <Textarea rows={2} placeholder="Ta réponse…" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={add.isPending || !replyText.trim()} onClick={() => add.mutate({ body: replyText, parentId: c.id })}>Répondre</Button>
            <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyText(""); }}>Annuler</Button>
          </div>
        </div>
      )}
      {childrenOf(c.id).length > 0 && (
        <ul className="mt-2 space-y-1">
          {childrenOf(c.id).map((child) => renderComment(child, depth + 1))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="space-y-3">
      {session ? (
        <div className="space-y-2">
          <Textarea rows={2} placeholder="Ton commentaire…" value={text} onChange={(e) => setText(e.target.value)} />
          <Button size="sm" disabled={add.isPending || !text.trim()} onClick={() => add.mutate({ body: text, parentId: null })}>Publier</Button>
        </div>
      ) : (
        <button onClick={() => requireAuth(() => {})} className="text-xs text-primary underline">
          Connecte-toi pour commenter
        </button>
      )}
      {roots.length === 0 && <p className="text-xs text-muted-foreground">Aucun commentaire pour l'instant.</p>}
      <ul className="space-y-2">
        {roots.map((c) => renderComment(c))}
      </ul>
    </div>
  );
}

export function ContentRatingSection({ contentType, contentId }: Props) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const key = ["content-ratings", contentType, contentId];

  useEffect(() => {
    const ch = supabase
      .channel(`crate-${contentType}-${contentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_ratings", filter: `content_id=eq.${contentId}` }, () =>
        qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [contentType, contentId, qc]);

  const { data: agg } = useQuery({
    queryKey: [...key, "agg"],
    queryFn: async () => {
      const { data } = await supabase.from("content_ratings").select("stars").eq("content_type", contentType).eq("content_id", contentId);
      const arr = data ?? [];
      const avg = arr.length ? arr.reduce((s, r) => s + r.stars, 0) / arr.length : 0;
      return { avg, count: arr.length };
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: [...key, "list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_ratings")
        .select("stars, comment, user_id, created_at")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      let pseudos: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, pseudo").in("id", ids);
        pseudos = Object.fromEntries((profs ?? []).map((p) => [p.id, p.pseudo]));
      }
      return rows.map((r) => ({ ...r, pseudo: pseudos[r.user_id] ?? "auditeur" }));
    },
  });

  const rate = useMutation({
    mutationFn: async () => {
      if (!session || !stars) return;
      const { error } = await supabase.from("content_ratings").upsert({
        content_type: contentType,
        content_id: contentId,
        user_id: session.user.id,
        stars,
        comment: comment.trim() ? comment.trim() : null,
      }, { onConflict: "content_type,content_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Merci pour ta note !");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => requireAuth(() => { setStars(n); rate.mutate(); })} aria-label={`${n} étoiles`}>
            <Star className={`size-5 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
        {agg && agg.count > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">★ {agg.avg.toFixed(1)} ({agg.count})</span>
        )}
      </div>
      {stars > 0 && (
        <div className="space-y-2">
          <Textarea rows={2} placeholder="Un commentaire ? (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" disabled={rate.isPending} onClick={() => requireAuth(() => rate.mutate())}>Publier ma note</Button>
        </div>
      )}
      {reviews.length > 0 && (
        <ul className="space-y-2 border-t pt-2">
          {reviews.map((r, i) => (
            <li key={i} className="text-xs">
              <span className="font-semibold">{r.pseudo}</span>
              <span className="text-muted-foreground"> · {"★".repeat(r.stars)}</span>
              {r.comment && <p className="text-foreground/90">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}