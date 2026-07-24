import { createFileRoute } from "@tanstack/react-router";

// IndexNow key verification file. Bing/Yandex/etc. fetch this URL and
// compare its contents against the `key` submitted in the ping. The URL
// is passed as `keyLocation` in every ping so the key file can live
// anywhere on the domain.
export const Route = createFileRoute("/api/public/indexnow-key.txt")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.INDEXNOW_KEY;
        if (!key) {
          return new Response("IndexNow key not configured", { status: 503 });
        }
        return new Response(key, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});