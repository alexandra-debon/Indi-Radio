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
      const [{ count }, own] = await Promise.all([
        supabase.from(table as any).select("*", { count: "exact", head: true }).eq("comment_id", commentId),
        uid
          ? supabase.from(table as any).select("id").eq("comment_id", commentId).eq("user_id", uid).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return { count: count ?? 0, liked: !!(own as any).data };
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

  return (
    <button
      onClick={(e) => { e.stopPropagation(); uid ? toggle.mutate() : openAuth(); }}
      className={`inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] ${data?.liked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      aria-label="J'aime ce commentaire"
    >
      <Heart className={`size-3 ${data?.liked ? "fill-current" : ""}`} /> {data?.count ?? 0}
    </button>
  );
}