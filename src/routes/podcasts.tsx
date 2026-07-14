import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Headphones, Play, Pause, Star, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/podcasts")({
  head: () => ({
    meta: [
      { title: "Podcasts — Indi Radio" },
      { name: "description", content: "Écoute et note les podcasts d'Indi Radio." },
      { property: "og:title", content: "Podcasts — Indi Radio" },
      { property: "og:description", content: "La bibliothèque de podcasts d'Indi Radio." },
    ],
  }),
  component: PodcastsPage,
});

function PodcastsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: podcasts = [] } = useQuery({
    queryKey: ["podcasts"],
    queryFn: async () => {
      const { data } = await supabase.from("podcasts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="section-title">Podcasts</h1>
      {podcasts.length === 0 && (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">Aucun podcast pour l'instant.</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {podcasts.map((p) => (
          <button key={p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)} className="card-brut overflow-hidden text-left">
            <div className="aspect-square bg-muted">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.title} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center"><Headphones className="size-8 text-muted-foreground" /></div>
              )}
            </div>
            <div className="p-2">
              <div className="truncate text-sm font-semibold">{p.title}</div>
              {p.description && <div className="line-clamp-2 text-xs text-muted-foreground">{p.description}</div>}
            </div>
          </button>
        ))}
      </div>

      {openId && <PodcastEpisodes podcastId={openId} />}
    </div>
  );
}

function PodcastEpisodes({ podcastId }: { podcastId: string }) {
  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes", podcastId],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("podcast_id", podcastId).order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Épisodes</h2>
      {episodes.length === 0 && <div className="card-brut p-3 text-sm text-muted-foreground">Aucun épisode.</div>}
      {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} />)}
    </section>
  );
}

function EpisodeRow({ ep }: { ep: { id: string; title: string; audio_url: string | null; duration_seconds: number | null; external_url?: string | null; description?: string | null } }) {
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
          <button onClick={toggle} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        ) : ep.external_url ? (
          <a href={ep.external_url} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <ExternalLink className="size-4" />
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{ep.title}</div>
          {ep.description && <div className="line-clamp-2 text-xs text-muted-foreground">{ep.description}</div>}
          <div className="text-xs text-muted-foreground">
            {ep.duration_seconds ? `${Math.round(ep.duration_seconds / 60)} min` : ""}
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