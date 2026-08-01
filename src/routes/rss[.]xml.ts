import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  loadActus,
  loadChroniques,
  loadClips,
  loadEpisodes,
  loadShows,
  renderFeed,
  feedResponse,
  sortByDate,
  FEED_LIMIT,
} from "@/lib/rss";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [chroniques, actus, clips, episodes, shows] = await Promise.all([
          loadChroniques(),
          loadActus(),
          loadClips(),
          loadEpisodes(false),
          loadShows(),
        ]);
        const items = sortByDate([
          ...chroniques,
          ...actus,
          ...clips,
          ...episodes,
          ...shows,
        ]).slice(0, FEED_LIMIT);
        const body = renderFeed(
          {
            title: "InDi RaDio — 24/7 de la musique indépendante",
            description:
              "Toutes les nouveautés d'InDi RaDio : chroniques d'albums, actus, clips, émissions et épisodes de la scène indépendante.",
            link: "/",
            selfPath: "/rss.xml",
          },
          items,
        );
        return feedResponse(request, body);
      },
    },
  },
});
