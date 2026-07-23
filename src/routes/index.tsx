import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialWall } from "@/components/wall/SocialWall";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { Play, Pause, Radio as RadioIcon, History, BarChart3, Loader2, Users, Map } from "lucide-react";
import { Mail } from "lucide-react";
import { openOnboardingTour } from "@/components/onboarding/OnboardingTour";
import { LikeButton } from "@/components/radio/LikeButton";
import { VolumeControl } from "@/components/radio/VolumeControl";
import { AudioBars } from "@/components/radio/AudioBars";
import { LiveIndicator } from "@/components/radio/LiveIndicator";
import { Link } from "@tanstack/react-router";
import { ShareButton } from "@/components/share/ShareButton";
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
      { title: "Radio gratuite 24/7 musique indépendante — InDi RaDio" },
      {
        name: "description",
        content:
          "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio.",
      },
      {
        name: "keywords",
        content:
          "radio gratuite, radio musique indé, radio musique indépendante, radio gratuite musique indépendante, radio sans pub, réseau social musique, radio indépendante, InDi RaDio",
      },
      { property: "og:title", content: "Radio gratuite 24/7 musique indépendante — InDi RaDio" },
      {
        property: "og:description",
        content:
          "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio.",
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RadioStation",
          "@id": "https://radio.indi-art-culture.com/#radio",
          name: "InDi RaDio",
          url: "https://radio.indi-art-culture.com/",
          image: {
            "@type": "ImageObject",
            url: OG_HOME,
            width: 1200,
            height: 630,
          },
          logo: "https://radio.indi-art-culture.com/icons/apple-touch-icon.png",
          description:
            "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante.",
          parentOrganization: {
            "@id": "https://radio.indi-art-culture.com/#org",
          },
          audio: {
            "@type": "AudioObject",
            contentUrl: "http://ecmanager6.pro-fhi.net:2180/stream",
            encodingFormat: "audio/mpeg",
            name: "Flux audio InDi RaDio",
          },
          broadcastFrequency: "24/7",
          genre: ["Indie", "Musique indépendante", "Radio communautaire"],
          areaServed: {
            "@type": "Country",
            name: "France",
          },
          inLanguage: "fr-FR",
          potentialAction: {
            "@type": "ListenAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://radio.indi-art-culture.com/",
              actionPlatform: [
                "http://schema.org/DesktopWebPlatform",
                "http://schema.org/MobileWebPlatform",
                "http://schema.org/AndroidPlatform",
                "http://schema.org/IOSPlatform",
              ],
            },
            expectsAcceptanceOf: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
            },
          },
        }),
      },
    ],
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
        <div className="grid grid-cols-[10rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[19rem_minmax(0,1fr)]">
          <h1 className="w-[10rem] shrink-0 rotate-[-1.5deg] bg-yellow-400 px-2.5 py-1.5 font-display text-[1.18rem] font-black uppercase leading-[0.95] tracking-[0.08em] text-yellow-950 shadow-[4px_4px_0_0_oklch(0_0_0)] sm:w-[18.5rem] sm:text-[1.7rem]">
            <span className="block">{t("page.live.now.line1")}</span>
            <span className="block">{t("page.live.now.line2")}</span>
          </h1>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-950">
              <span className="size-2 rounded-full bg-yellow-950 animate-pulse-dot" />
              {t("live.indieNoAds")}
            </span>
            <span className="rounded-full border border-yellow-400/70 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-400">
              {t("live.noAdsNoNews")}
            </span>
            <UserCountBadge />
            <button
              type="button"
              onClick={() => openOnboardingTour(lang)}
              aria-label={t("tour.aria")}
              data-tour="tour-button"
              className="inline-flex items-center gap-1 rounded-full border border-primary/70 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary transition hover:-translate-y-0.5 hover:bg-primary/20"
            >
              <Map className="size-3" aria-hidden="true" />
              {t("tour.open")}
            </button>
          </div>
        </div>
        <div className="card-brut relative overflow-hidden p-4" data-tour="radio-player">
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
                {currentTrack && (
                  <div className="flex items-center gap-1">
                    <ShareButton
                      target={{
                        url: "/",
                        title: `${currentTrack.artist} — ${currentTrack.title}`,
                        text: t("live.shareText").replace("{title}", currentTrack.title),
                      }}
                      label={t("live.shareTrack")}
                      variant="icon"
                    />
                    <LikeButton trackId={currentTrack.id} />
                  </div>
                )}
              </div>
              <div className="mt-2" data-tour="volume-control">
                <VolumeControl />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social wall */}
      <div data-tour="social-wall">
        <SocialWall />
      </div>

      {/* Newsletter banner */}
      <NewsletterBanner />

      {/* Recent history */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="section-title">{t("page.live.history")}</h2>
          <Link
            to="/chart"
            data-tour="chart-link"
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
