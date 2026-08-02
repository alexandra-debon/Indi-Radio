import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadMagazines, renderFeed, feedLastBuild, feedResponse, sortByDate, FEED_LIMIT } from "@/lib/rss";

export const Route = createFileRoute("/rss-magazine.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = sortByDate(await loadMagazines()).slice(0, FEED_LIMIT);
        const body = await renderFeed(
          {
            title: "Magazine InDi Art Culture — InDi RaDio 24/7 de la musique indépendante",
            description:
              "Les numéros du magazine interactif InDi Art Culture : dossiers, portraits et reportages sur la scène indépendante.",
            link: "/magazines",
            selfPath: "/rss-magazine.xml",
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});