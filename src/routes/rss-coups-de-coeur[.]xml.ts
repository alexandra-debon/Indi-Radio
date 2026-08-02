import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadCoupsDeCoeur, renderFeed, feedLastBuild, feedResponse, sortByDate, FEED_LIMIT } from "@/lib/rss";

export const Route = createFileRoute("/rss-coups-de-coeur.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = sortByDate(await loadCoupsDeCoeur()).slice(0, FEED_LIMIT);
        const body = renderFeed(
          {
            title: "Coups de cœur — InDi RaDio 24/7 de la musique indépendante",
            description:
              "Les coups de cœur de la rédaction d'InDi RaDio : découvertes, albums et artistes indépendants à ne pas manquer.",
            link: "/coups-de-coeur",
            selfPath: "/rss-coups-de-coeur.xml",
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});