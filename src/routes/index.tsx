import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialWall } from "@/components/wall/SocialWall";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { Play, Pause, Radio as RadioIcon, History, BarChart3, Loader2, Users } from "lucide-react";
import { Mail } from "lucide-react";
import { LikeButton } from "@/components/radio/LikeButton";
import { VolumeControl } from "@/components/radio/VolumeControl";
import { AudioBars } from "@/components/radio/AudioBars";
import { LiveIndicator } from "@/components/radio/LiveIndicator";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { PresenceTicker } from "@/components/radio/PresenceTicker";
import { useArtwork } from "@/hooks/use-artwork";
import { useQueryClient } from "@tanstack/react-query";
import { useHashHighlight } from "@/lib/notif-navigate";
import { useServerFn } from "@tanstack/react-start";
import { getUserCount } from "@/lib/public-stats.functions";
import ogHome from "@/assets/og-home.jpg";
import { useLang, useT } from "@/lib/i18n";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_HOME = `${BASE_URL}${ogHome}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InDi RaDio — Live 24/7 musique  indépendante" },
      {
        name: "description",
        content:
          "Écoute Indi Radio en direct. Plus qu’une radiao. Découvre  les artistes indé, participe au mur social , retrouve l'historique des titres passés à l'antenne et +",
      },
      { property: "og:title", content: "InDi RaDio — Live 24/7 musique  indépendante" },
      {
        property: "og:description",
        content:
          "Écoute Indi Radio en direct. Plus qu’une radiao. Découvre  les artistes indé, participe au mur social , retrouve l'historique des titres passés à l'antenne et +",
      },
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

function UserCountBadge() {
  const t = useT();
  const fetchCount = useServerFn(getUserCount);
  const { data, isLoading } = useQuery({
    queryKey: ["user-count"],
    queryFn: () => fetchCount(),
    staleTime: 60_000,
  });
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
      <Users className="size-3" />
      {isLoading ? "…" : `${data?.count ?? 0} ${t("live.registered")}`}
    </span>
  );
}

function LivePage() {
  const { playing, loading, toggle, currentTrack, durationKnown } = useRadio();
  const t = useT();
  const { lang } = useLang();
  const { data: heroArtwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  useHashHighlight();

  const qcRoot = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("track-history-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "track_history" },
        () => {
          qcRoot.invalidateQueries({ queryKey: ["track-history-short"] });
          qcRoot.invalidateQueries({ queryKey: ["current-track"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qcRoot]);

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
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="space-y-6">
      <PresenceTicker />

      {/* NOW PLAYING hero */}
      <section className="space-y-3">
        <div className="flex items-start gap-2">
          <h1 className="section-title">{t("page.live.now")}</h1>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
              <span className="size-2 rounded-full bg-yellow-950 animate-pulse-dot" />
              {t("live.indieNoAds")}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              <span className="rounded-full border border-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                {t("live.noAdsNoNews")}
              </span>
              <UserCountBadge />
            </div>
          </div>
        </div>
        <div className="card-brut relative overflow-hidden p-4">
          <div className="flex items-center gap-4">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
              {heroArtwork ? (
                <img
                  src={heroArtwork}
                  alt={
                    currentTrack
                      ? `Pochette de « ${currentTrack.title} » par ${currentTrack.artist}`
                      : "Pochette de l'album en cours"
                  }
                  className="absolute inset-0 size-full object-cover"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Retry once by cache-busting; some mobile networks return a transient 403.
                    const img = e.currentTarget;
                    if (!img.dataset.retried) {
                      img.dataset.retried = "1";
                      img.src =
                        heroArtwork + (heroArtwork.includes("?") ? "&" : "?") + "r=" + Date.now();
                    }
                  }}
                />
              ) : (
                <RadioIcon className="size-10" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-primary">
                <span className="animate-heartbeat">{t("live.onAir")}</span>
                <AudioBars />
              </div>
              <div className="mt-1 truncate text-xl font-bold">
                {currentTrack?.title ?? t("live.defaultTitle")}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {currentTrack?.artist ?? t("live.defaultArtist")}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={
                    loading
                      ? "Chargement du flux Indi Radio"
                      : playing
                        ? "Mettre en pause Indi Radio"
                        : t("live.listen")
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
                {playing ? (
                  <LiveIndicator />
                ) : (
                  <span className="text-sm font-bold uppercase tracking-wide" aria-live="polite">
                    {loading ? t("live.connecting") : t("live.listen")}
                  </span>
                )}
                {currentTrack && <LikeButton trackId={currentTrack.id} />}
              </div>
              <div className="mt-2">
                <VolumeControl />
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
          <h2 className="section-title">{t("page.live.history")}</h2>
          <Link
            to="/chart"
            className="group flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/10 p-3 transition hover:-translate-y-0.5 hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(255,215,0,0.18)] sm:min-w-[18rem]"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <BarChart3 className="size-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-primary">{t("home.chartTitle")}</span>
                <span className="text-[11px] text-muted-foreground">{t("home.chartSubtitle")}</span>
              </div>
            </div>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground transition group-hover:translate-x-0.5">
              {t("home.see")}
            </span>
          </Link>
        </div>
        <ul className="space-y-2">
          {history.length === 0 && (
            <li className="card-brut p-4 text-center text-sm text-muted-foreground">
              {t("home.historyEmpty")}
            </li>
          )}
          {history.map((t) => (
            <HistoryRow key={t.id} track={t} locale={lang === "en" ? enUS : fr} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function NewsletterBanner() {
  const t = useT();
  return (
    <Link
      to="/newsletter"
      search={{ source: "home-banner" }}
      className="card-brut flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:bg-primary/10"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Mail className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{t("newsletter.title")}</div>
        <div className="text-[11px] text-muted-foreground">
          {t("newsletter.subtitle")}
        </div>
      </div>
      <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
        {t("newsletter.cta")}
      </span>
    </Link>
  );
}

function HistoryRow({
  track,
  locale,
}: {
  track: { id: string; title: string; artist: string; played_at: string };
  locale: typeof fr;
}) {
  const { data: artwork, refetch } = useArtwork(track.artist, track.title);
  const qc = useQueryClient();
  return (
    <li className="card-brut flex items-center gap-3 p-2.5">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-muted text-muted-foreground">
        {artwork ? (
          <img
            src={artwork}
            alt={`${track.title} — ${track.artist}`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.retried) {
                img.dataset.retried = "1";
                img.src = artwork + (artwork.includes("?") ? "&" : "?") + "r=" + Date.now();
              } else {
                // Give up on this URL and re-query the provider.
                qc.removeQueries({ queryKey: ["artwork", "v4", track.artist, track.title] });
                refetch();
              }
            }}
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
        {formatDistanceToNow(new Date(track.played_at), { addSuffix: true, locale })}
      </span>
    </li>
  );
}
