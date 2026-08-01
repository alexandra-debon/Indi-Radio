import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadClips, renderFeed, feedResponse } from "@/lib/rss";

export const Route = createFileRoute("/rss-clips.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const items = await loadClips();
        const body = renderFeed(
          {
            title: "Clip Addict — InDi RaDio",
            description:
              "Les clips et playlists vidéo de la scène indépendante sélectionnés par InDi RaDio.",
            link: "/clips",
            selfPath: "/rss-clips.xml",
          },
          items,
        );
        return feedResponse(request, body);
      },
    },
  },
});
