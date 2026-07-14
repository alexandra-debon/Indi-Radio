import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SocialWall } from "@/components/wall/SocialWall";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { Play, Pause, Radio as RadioIcon, History, BarChart3 } from "lucide-react";
import { LikeButton } from "@/components/radio/LikeButton";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PresenceTicker } from "@/components/radio/PresenceTicker";
import { useArtwork } from "@/hooks/use-artwork";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Indi Radio — Live 24/7 des arts indépendants" },
      { name: "description", content: "Écoute Indi Radio en direct, découvre les artistes indé, participe au mur social et retrouve l'historique des titres passés à l'antenne." },
      { property: "og:title", content: "Indi Radio — Live 24/7 des arts indépendants" },
      { property: "og:description", content: "Le live d'Indi Radio, le mur social, l'historique des titres et les actus de la scène indé." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { playing, toggle, currentTrack } = useRadio();
  const { data: heroArtwork } = useArtwork(currentTrack?.artist, currentTrack?.title);

  const { data: history = [] } = useQuery({
    queryKey: ["track-history-short"],
    queryFn: async () => {
      const { data } = await supabase
        .from("track_history")
        .select("id,title,artist,played_at")
        .order("played_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PresenceTicker />

      {/* NOW PLAYING hero */}
      <section className="space-y-3">
        <h1 className="section-title">Musique en cours</h1>
        <div className="card-brut relative overflow-hidden p-4">
          <div className="flex items-center gap-4">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
              {heroArtwork ? (
                <img
                  src={heroArtwork}
                  alt={currentTrack ? `Pochette de « ${currentTrack.title} » par ${currentTrack.artist}` : "Pochette de l'album en cours"}
                  className="absolute inset-0 size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <RadioIcon className="size-10" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-widest text-primary">On air</div>
              <div className="mt-1 truncate text-xl font-bold">{currentTrack?.title ?? "Indi Radio — live"}</div>
              <div className="truncate text-sm text-muted-foreground">{currentTrack?.artist ?? "Le flux tourne 24/7"}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={toggle}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {playing ? "Pause" : "Écouter"}
                </button>
                {currentTrack && <LikeButton trackId={currentTrack.id} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social wall */}
      <SocialWall />

      {/* Recent history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Historique</h2>
          <Link to="/chart" className="text-xs text-primary underline">
            Chart des auditeurs →
          </Link>
        </div>
        <ul className="space-y-2">
          {history.length === 0 && (
            <li className="card-brut p-4 text-center text-sm text-muted-foreground">
              Aucun titre enregistré pour l'instant.
            </li>
          )}
          {history.map((t) => (
            <HistoryRow key={t.id} track={t} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function HistoryRow({
  track,
}: {
  track: { id: string; title: string; artist: string; played_at: string };
}) {
  const { data: artwork } = useArtwork(track.artist, track.title);
  return (
    <li className="card-brut flex items-center gap-3 p-2.5">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-muted text-muted-foreground">
        {artwork ? (
          <img
            src={artwork}
            alt={`${track.title} — ${track.artist}`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : (
          <History className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      <span className="text-[10px] text-muted-foreground">
        {formatDistanceToNow(new Date(track.played_at), { addSuffix: true, locale: fr })}
      </span>
    </li>
  );
}
