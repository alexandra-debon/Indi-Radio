import { useState } from "react";
import { Play, Pause, Star, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type EpisodeLike = {
  id: string;
  title: string;
  audio_url: string | null;
  duration_seconds: number | null;
  external_url?: string | null;
  description?: string | null;
  published_at?: string | null;
};

export function EpisodeRow({ ep }: { ep: EpisodeLike }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => (typeof Audio !== "undefined" && ep.audio_url ? new Audio(ep.audio_url) : null));
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const { data: agg } = useQuery({
    queryKey: ["ep-ratings", ep.id],
    queryFn: async () => {
      const { data } = await supabase.from("episode_ratings").select("stars").eq("episode_id", ep.id);
      const arr = data ?? [];
      const avg = arr.length ? arr.reduce((s, r) => s + r.stars, 0) / arr.length : 0;
      return { avg, count: arr.length };
    },
  });

  const rate = useMutation({
    mutationFn: async () => {
      if (!session || !stars) return;
      const { error } = await supabase.from("episode_ratings").upsert({
        episode_id: ep.id,
        user_id: session.user.id,
        stars,
        comment: comment || null,
      }, { onConflict: "episode_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Merci pour ta note !"); qc.invalidateQueries({ queryKey: ["ep-ratings", ep.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function toggle() {
    if (!audio) return;
    if (audio.paused) { audio.play(); setPlaying(true); }
    else { audio.pause(); setPlaying(false); }
  }

  return (
    <div className="card-brut space-y-2 p-3">
      <div className="flex items-center gap-3">
        {ep.audio_url ? (
          <button onClick={toggle} aria-label={playing ? `Mettre en pause « ${ep.title} »` : `Lire l'épisode « ${ep.title} »`} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        ) : ep.external_url ? (
          <a href={ep.external_url} target="_blank" rel="noreferrer" aria-label={`Écouter « ${ep.title} » (nouvelle fenêtre)`} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <ExternalLink className="size-4" />
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{ep.title}</div>
          {ep.description && <div className="line-clamp-3 text-xs text-muted-foreground">{ep.description}</div>}
          <div className="text-xs text-muted-foreground">
            {ep.duration_seconds ? `${Math.round(ep.duration_seconds / 60)} min` : ""}
            {ep.published_at ? ` · ${new Date(ep.published_at).toLocaleDateString("fr-FR")}` : ""}
            {agg && agg.count > 0 && ` · ★ ${agg.avg.toFixed(1)} (${agg.count})`}
          </div>
        </div>
        {ep.audio_url && ep.external_url && (
          <a href={ep.external_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Manager</a>
        )}
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => requireAuth(() => setStars(n))} aria-label={`${n} étoiles`}>
            <Star className={`size-5 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Ta note</span>
      </div>
      {stars > 0 && (
        <div className="space-y-2">
          <Textarea rows={2} placeholder="Un mot ? (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" onClick={() => requireAuth(() => rate.mutate())}>Envoyer ma note</Button>
        </div>
      )}
    </div>
  );
}