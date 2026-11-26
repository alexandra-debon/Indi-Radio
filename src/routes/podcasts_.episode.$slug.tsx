import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FeaturedJovannaPodcast } from "@/components/FeaturedJovannaPodcast";
import { OfflineEpisodesList } from "@/components/podcast/OfflineEpisodesList";
import { findInAppEpisode } from "@/lib/jovanna-podcast";
import { useLang } from "@/lib/i18n";

const SITE = "https://www.radio.indi-art-culture.com";

export const Route = createFileRoute("/podcasts_/episode/$slug")({
  loader: ({ params }) => {
    const ep = findInAppEpisode(params.slug);
    if (!ep) throw notFound();
    return { slug: ep.slug, title: ep.title, host: ep.host, episode: ep.episode };
  },
  head: ({ loaderData, match }) => {
    const en = (match.search as { hl?: string } | undefined)?.hl === "en";
    const d = loaderData;
    const title = d ? `InDi RaDio - ${d.title} · ${en ? "Episode" : "Épisode"} ${String(d.episode).padStart(2, "0")} avec ${d.host}` : "InDi RaDio - Podcast";
    const desc = en
      ? `Listen to ${d?.title} hosted by ${d?.host} directly in the InDi RaDio app, with protected offline listening.`
      : `Écoutez ${d?.title}, l’émission de ${d?.host}, directement dans l’application InDi RaDio, avec écoute hors ligne protégée.`;
    const url = `${SITE}/podcasts/episode/${d?.slug ?? ""}${en ? "?hl=en" : ""}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "music.radio_station" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: EpisodePage,
});

function EpisodePage() {
  const { lang } = useLang();
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link to="/podcasts" className="text-xs font-semibold text-primary underline">
        {lang === "en" ? "← All podcasts" : "← Tous les podcasts"}
      </Link>
      <FeaturedJovannaPodcast showSheetLink={false} titleAs="h1" />
      <OfflineEpisodesList />
    </div>
  );
}
