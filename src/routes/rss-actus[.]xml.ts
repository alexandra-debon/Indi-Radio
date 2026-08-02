import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadActus, renderFeed, feedResponse, feedLastBuild } from "@/lib/rss";

export const Route = createFileRoute("/rss-actus.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = await loadActus();
        const body = await renderFeed(
          {
            title: "Actus — InDi RaDio",
            description:
              "Les actualités de la scène indépendante publiées sur InDi RaDio, radio 24/7 de la musique indépendante.",
            link: "/actus",
            selfPath: "/rss-actus.xml",
          },
          items,
        );
        return feedResponse(request, body, feedLastBuild(items));
      },
    },
  },
});
