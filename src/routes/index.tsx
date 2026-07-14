import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SocialWall } from "@/components/wall/SocialWall";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { Play, Pause, Radio as RadioIcon, History } from "lucide-react";
import { LikeButton } from "@/components/radio/LikeButton";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PresenceTicker } from "@/components/radio/PresenceTicker";

export const Route = createFileRoute("/")({
  component: LivePage,
});

function LivePage() {
  const { playing, toggle, currentTrack } = useRadio();

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
            <div className="grid size-24 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <RadioIcon className="size-10" />
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
            <li key={t.id} className="card-brut flex items-center gap-3 p-2.5">
              <History className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.title}</div>
                <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(t.played_at), { addSuffix: true, locale: fr })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
