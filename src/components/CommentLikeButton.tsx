import { Heart } from "lucide-react";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Kind = "post" | "news";

export function CommentLikeButton({ commentId, kind }: { commentId: string; kind: Kind }) {
  const { session, openAuth } = useAuth();
  const qc = useQueryClient();
  const table = kind === "post" ? "post_comment_likes" : "news_comment_likes";
  const uid = session?.user.id ?? null;
  const key = ["comment-likes", kind, commentId, uid ?? "anon"];

  useEffect(() => {
    const channel = supabase
      .channel(`clike-${kind}-${commentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `comment_id=eq.${commentId}` },
        () => qc.invalidateQueries({ queryKey: ["comment-likes", kind, commentId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [commentId, kind, table, qc]);

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: rows, count } = await supabase
        .from(table as any)
        .select("user_id", { count: "exact" })
        .eq("comment_id", commentId)
        .order("created_at", { ascending: false })
        .limit(20);
      const userIds = ((rows ?? []) as any[]).map((r) => r.user_id as string);
      let likers: { id: string; pseudo: string }[] = [];
      if (uid && userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, pseudo")
          .in("id", userIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p.pseudo]));
        likers = userIds.map((id) => ({ id, pseudo: map.get(id) ?? "?" }));
      }
      return {
        count: count ?? userIds.length,
        liked: uid ? userIds.includes(uid) : false,
        likers,
      };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (data?.liked) {
        await supabase.from(table as any).delete().eq("comment_id", commentId).eq("user_id", uid);
      } else {
        await supabase.from(table as any).insert({ comment_id: commentId, user_id: uid } as any);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comment-likes", kind, commentId] }),
  });

  const count = data?.count ?? 0;
  const likers = data?.likers ?? [];
  const names = likers.slice(0, 3).map((l) => l.pseudo);
  const extra = Math.max(0, count - names.length);
  const summary = uid && count > 0
    ? names.join(", ") + (extra > 0 ? ` et ${extra} autre${extra > 1 ? "s" : ""}` : "")
    : null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); uid ? toggle.mutate() : openAuth(); }}
        className={`inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] ${data?.liked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        aria-label="J'aime ce commentaire"
      >
        <Heart className={`size-3 ${data?.liked ? "fill-current" : ""}`} /> {count}
      </button>
      {summary && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[220px]" title={likers.map((l) => l.pseudo).join(", ")}>
          Aimé par {summary}
        </span>
      )}
    </span>
  );
}