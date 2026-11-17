import cover from "@/assets/jovanna-episode-01-cover.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { JOVANNA_EPISODE, jovannaListeningUrl } from "@/lib/jovanna-podcast";
import { ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { InAppPodcastPlayer } from "@/components/podcast/InAppPodcastPlayer";

const TXT = {
  fr: {
    badge: "Nouveau · Épisode 01",
    host: "Une émission animée par Jovanna · Réalisation sonore : Manu",
    date: "Diffusé le 13 novembre 2026 à 21 h · 62 min 14 s",
    description: "Un voyage dans la musique indépendante, entre découvertes, histoires de disques et culture à vif. Pour ce premier épisode : SLIFT, Shilpa Ray, Metro Verlaine, Loa Mercury, Last Train × Bandit Bandit, Lamu et Rodolphe Burger.",
    finale: "Le mix final : All Them Witches, False Heads, Nova Twins et Pastis Agressif.",
    cta: "Page de l’émission sur InDi ArT CulTuRe",
    sheet: "Fiche de l’épisode",
    alt: "Pochette du podcast C’était mieux demain avec Jovanna",
  },
  en: {
    badge: "New · Episode 01",
    host: "Hosted by Jovanna · Sound engineer: Manu",
    date: "Broadcast on 13 November 2026 at 9 pm (Paris) · 62 min 14 s",
    description: "A journey through independent music, discoveries, record stories and raw culture. This first episode features SLIFT, Shilpa Ray, Metro Verlaine, Loa Mercury, Last Train × Bandit Bandit, Lamu and Rodolphe Burger.",
    finale: "The final mix: All Them Witches, False Heads, Nova Twins and Pastis Agressif.",
    cta: "Show page on InDi ArT CulTuRe",
    sheet: "Episode page",
    alt: "Cover of the C’était mieux demain podcast featuring Jovanna",
  },
} as const;

export function FeaturedJovannaPodcast({ showSheetLink = true }: { showSheetLink?: boolean }) {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const listeningUrl = jovannaListeningUrl(lang);
  return (
    <section className="grid gap-5 border-b pb-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
      <div className="mx-auto block w-full max-w-[280px]">
        <img src={cover.url} alt={t.alt} width={707} height={707} className="aspect-square w-full rounded object-contain" loading="eager" />
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-xs font-bold uppercase text-primary">{t.badge}</p>
        <h2 className="text-2xl font-bold leading-tight">{JOVANNA_EPISODE.title}</h2>
        <p className="text-sm font-semibold">{t.host}</p>
        <p className="text-xs text-muted-foreground">{t.date}</p>
        <p className="text-sm">{t.description}</p>
        <p className="text-sm text-muted-foreground">{t.finale}</p>
        <InAppPodcastPlayer episode={JOVANNA_EPISODE} />
        <div className="flex flex-wrap gap-3 text-xs">
          {showSheetLink && (
            <Link to="/podcasts/episode/$slug" params={{ slug: JOVANNA_EPISODE.slug }} className="font-semibold text-primary underline">{t.sheet}</Link>
          )}
          <a href={listeningUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground underline">
            {t.cta} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}