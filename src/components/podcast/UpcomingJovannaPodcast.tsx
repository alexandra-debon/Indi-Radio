import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import cover from "@/assets/jovanna-episode-02-cover.jpeg.asset.json";
import { Button } from "@/components/ui/button";
import { LinkedShowLink } from "@/components/podcast/ShowPodcastEpisodes";
import { useLang } from "@/lib/i18n";
import { episodePreviewsForShow, JOVANNA_EPISODE_2_PREVIEW } from "@/lib/jovanna-podcast";

const TXT = {
  fr: {
    badge: "À venir · Épisode 02",
    host: "Une émission animée par Jovanna",
    date: "Diffusion le 27 novembre 2026 à 21 h",
    description: "Jovanna vous donne rendez-vous pour un nouveau voyage dans la musique indépendante. L’épisode sera disponible en réécoute après sa diffusion sur InDi RaDio.",
    pending: "Lecteur en attente",
    waiting: "La lecture sera activée après la diffusion de l’émission.",
    view: "Voir l’annonce du podcast",
    alt: "Visuel de l’épisode 02 de C’était mieux demain avec Jovanna",
  },
  en: {
    badge: "Coming soon · Episode 02",
    host: "Hosted by Jovanna",
    date: "Broadcast on 27 November 2026 at 9 pm (Paris)",
    description: "Join Jovanna for another journey through independent music. The episode will be available to listen again after its broadcast on InDi RaDio.",
    pending: "Player on standby",
    waiting: "Playback will be enabled after the show is broadcast.",
    view: "View the podcast announcement",
    alt: "Cover of episode 02 of C’était mieux demain with Jovanna",
  },
} as const;

export function UpcomingJovannaPodcast({ compact = false, showTitle }: { compact?: boolean; showTitle?: string }) {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const episode = JOVANNA_EPISODE_2_PREVIEW;

  if (showTitle && !episodePreviewsForShow(showTitle).some((item) => item.slug === episode.slug)) return null;

  if (compact) {
    return (
      <div className="mt-3 border-t pt-3">
        <div className="flex items-center gap-3">
          <img src={cover.url} alt={t.alt} width={1600} height={1600} className="size-20 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-bold uppercase text-primary">{t.badge}</p>
            <p className="truncate text-sm font-bold">{episode.title}</p>
            <p className="text-xs text-muted-foreground">{t.date}</p>
          </div>
          <Button size="icon" variant="outline" disabled aria-label={t.pending}><Play /></Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t.waiting}</p>
        <Link to="/podcasts" hash={episode.slug} className="mt-2 inline-block text-xs font-semibold text-primary underline">
          {t.view}
        </Link>
      </div>
    );
  }

  return (
    <section id={episode.slug} className="grid scroll-mt-24 gap-5 border-b pb-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
      <div className="mx-auto block w-full max-w-[280px]">
        <img src={cover.url} alt={t.alt} width={1600} height={1600} className="aspect-square w-full rounded object-cover" loading="eager" />
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-xs font-bold uppercase text-primary">{t.badge}</p>
        <h2 className="text-2xl font-bold leading-tight">{episode.title}</h2>
        <p className="text-sm font-semibold">{t.host}</p>
        <p className="text-xs text-muted-foreground">{t.date}</p>
        <p className="text-sm">{t.description}</p>
        <LinkedShowLink episodeTitle={episode.title} />
        <div className="card-brut space-y-3 p-4" aria-label={t.pending}>
          <div className="flex items-center gap-3">
            <Button size="icon" disabled aria-label={t.pending}><Play /></Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.pending}</p>
              <p className="text-xs text-muted-foreground">{t.waiting}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
