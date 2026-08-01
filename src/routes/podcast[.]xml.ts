import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadEpisodes, renderFeed, feedResponse, feedLastBuild, SITE_ORIGIN_ICON } from "@/lib/rss";

export const Route = createFileRoute("/podcast.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = await loadEpisodes(true);
        const body = renderFeed(
          {
            title: "InDi RaDio — Émissions & Podcasts",
            description:
              "Les émissions, chroniques et podcasts d'InDi RaDio, radio 24/7 de la musique indépendante, sans pub, sans info.",
            link: "/emissions",
            selfPath: "/podcast.xml",
            podcast: {
              author: "InDi ArT CulTuRe",
              ownerEmail: "contact@indi-art-culture.com",
              image: SITE_ORIGIN_ICON,
              category: "Music",
            },
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});
