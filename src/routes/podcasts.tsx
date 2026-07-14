import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Headphones } from "lucide-react";
import { EpisodeRow } from "@/components/EpisodeRow";

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