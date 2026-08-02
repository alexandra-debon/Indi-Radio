import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadChroniques, renderFeed, feedResponse, feedLastBuild } from "@/lib/rss";

export const Route = createFileRoute("/rss-chroniques.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = await loadChroniques();
        const body = await renderFeed(
          {
            title: "Chroniques d'albums — InDi RaDio",
            description:
              "Les chroniques d'albums de la scène indépendante publiées sur InDi RaDio, radio 24/7 de la musique indépendante.",
            link: "/chroniques",
            selfPath: "/rss-chroniques.xml",
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});
