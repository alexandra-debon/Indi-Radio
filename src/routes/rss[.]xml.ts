import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  loadActus,
  loadChroniques,
  loadClips,
  loadEpisodes,
  loadShows,
  loadMagazines,
  loadCoupsDeCoeur,
  renderFeed,
  feedLastBuild,
  feedResponse,
  sortByDate,
  FEED_LIMIT,
} from "@/lib/rss";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [chroniques, actus, clips, episodes, shows, magazines, coups] = await Promise.all([
          loadChroniques(),
          loadActus(),
          loadClips(),
          loadEpisodes(false),
          loadShows(),
          loadMagazines(),
          loadCoupsDeCoeur(),
        ]);
        const items = sortByDate([
          ...chroniques,
          ...actus,
          ...clips,
          ...episodes,
          ...shows,
          ...magazines,
          ...coups,
        ]).slice(0, FEED_LIMIT);
        const body = renderFeed(
          {
            title: "InDi RaDio — 24/7 de la musique indépendante",
            description:
              "Toutes les nouveautés d'InDi RaDio : magazine, chroniques d'albums, coups de cœur, actus, clips, émissions et épisodes de la scène indépendante.",
            link: "/",
            selfPath: "/rss.xml",
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});
