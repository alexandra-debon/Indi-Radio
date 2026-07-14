import { Heart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function LikeButton({ trackId }: { trackId: string }) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["track-likes", trackId, session?.user.id ?? "anon"],
    queryFn: async () => {
      const [{ count }, own] = await Promise.all([
        supabase.from("track_likes").select("*", { count: "exact", head: true }).eq("track_history_id", trackId),
        session
          ? supabase.from("track_likes").select("id").eq("track_history_id", trackId).eq("user_id", session.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { count: count ?? 0, liked: !!own.data };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!session) return;
      if (data?.liked) {
        await supabase.from("track_likes").delete().eq("track_history_id", trackId).eq("user_id", session.user.id);
      } else {
        await supabase.from("track_likes").insert({ track_history_id: trackId, user_id: session.user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track-likes", trackId] }),
  });

  return (
    <button
      onClick={() => requireAuth(() => toggle.mutate())}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs transition-colors",
        data?.liked ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
      )}
      aria-label={data?.liked ? "Retirer le like" : "Liker le titre"}
    >
      <Heart className={cn("size-3.5", data?.liked && "fill-current")} />
      <span>{data?.count ?? 0}</span>
    </button>
  );
}