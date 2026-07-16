import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialWall } from "@/components/wall/SocialWall";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { Play, Pause, Radio as RadioIcon, History, BarChart3, Loader2 } from "lucide-react";
import { Mail } from "lucide-react";
import { LikeButton } from "@/components/radio/LikeButton";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PresenceTicker } from "@/components/radio/PresenceTicker";
import { useArtwork } from "@/hooks/use-artwork";
import { useHashHighlight } from "@/lib/notif-navigate";
import ogHome from "@/assets/og-home.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_HOME = `${BASE_URL}${ogHome}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Indi Radio — Live 24/7 des arts indépendants" },
      { name: "description", content: "Écoute Indi Radio en direct, découvre les artistes indé, participe au mur social et retrouve l'historique des titres passés à l'antenne." },
      { property: "og:title", content: "Indi Radio — Live 24/7 des arts indépendants" },
      { property: "og:description", content: "Le live d'Indi Radio, le mur social, l'historique des titres et les actus de la scène indé." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_HOME },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_HOME },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { playing, loading, toggle, currentTrack } = useRadio();
  const { data: heroArtwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  useHashHighlight();

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
        <div className="flex items-start gap-2">
          <h1 className="section-title">Musique en cours</h1>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
              <span className="size-2 rounded-full bg-yellow-950 animate-pulse-dot" />
              Radio 100% musique Indé
            </span>
            <span className="rounded-full border border-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
              sans pub ni info
            </span>
          </div>
        </div>
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
                  type="button"
                  onClick={toggle}
                  aria-label={
                    loading
                      ? "Chargement du flux Indi Radio"
                      : playing
                      ? "Mettre en pause Indi Radio"
                      : "Écouter Indi Radio"
                  }
                  aria-pressed={playing}
                  aria-busy={loading}
                  data-state={loading ? "loading" : playing ? "playing" : "paused"}
                  className="group grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[3px_3px_0_0_oklch(0_0_0)] outline-none transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=playing]:ring-2 data-[state=playing]:ring-primary/60 data-[state=loading]:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : playing ? (
                    <Pause className="size-5" fill="currentColor" aria-hidden />
                  ) : (
                    <Play className="size-5 translate-x-[1px]" fill="currentColor" aria-hidden />
                  )}
                </button>
                <span
                  className="text-sm font-bold uppercase tracking-wide"
                  aria-live="polite"
                >
                  {loading
                    ? "Connexion…"
                    : playing
                    ? "En direct"
                    : "Écouter Indi Radio"}
                </span>
                {playing && !loading && <RadioWave />}
                {currentTrack && <LikeButton trackId={currentTrack.id} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social wall */}
      <SocialWall />

      {/* Newsletter banner */}
      <NewsletterBanner />

      {/* Recent history */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="section-title">Historique</h2>
          <Link
            to="/chart"
            className="group flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/10 p-3 transition hover:-translate-y-0.5 hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(255,215,0,0.18)] sm:min-w-[18rem]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <BarChart3 className="size-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-primary">Chart des auditeurs</span>
                <span className="text-[11px] text-muted-foreground">Top des titres aimés</span>
              </div>
            </div>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground transition group-hover:translate-x-0.5">
              Voir →
            </span>
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

function NewsletterBanner() {
  return (
    <Link
      to="/newsletter"
      className="card-brut flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:bg-primary/10"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Mail className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">Inscris-toi à la newsletter</div>
        <div className="text-[11px] text-muted-foreground">
          Une note quand il y a du neuf : émissions, podcasts, sorties.
        </div>
      </div>
      <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
        S'inscrire →
      </span>
    </Link>
  );
}

function RadioWave() {
  const { subscribeLevel } = useRadio();
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  // Multipliers per bar so the outer bars react a bit less than the inner ones
  const weights = [0.7, 0.95, 1.15, 0.95, 0.7];

  useEffect(() => {
    const smoothed = new Array(weights.length).fill(0);
    return subscribeLevel((level) => {
      // Boost quiet passages (audio RMS is usually 0.05..0.3) but clamp to 1
      const boosted = Math.min(1, level * 3.2);
      for (let i = 0; i < weights.length; i++) {
        const target = Math.min(1, boosted * weights[i]);
        // Ease toward target for a springy feel
        smoothed[i] = smoothed[i] * 0.55 + target * 0.45;
        const h = 20 + smoothed[i] * 80; // 20% .. 100%
        const el = barsRef.current[i];
        if (el) el.style.height = `${h}%`;
      }
    });
  }, [subscribeLevel]);

  return (
    <span aria-hidden className="inline-flex h-5 items-center gap-0.5">
      {weights.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="block w-0.5 rounded-sm bg-primary transition-[height] duration-75 ease-out"
          style={{ height: "20%" }}
        />
      ))}
    </span>
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
