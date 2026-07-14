import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "http://ecmanager6.pro-fhi.net:2180/stream";

// Proxy the HTTP Icecast stream so browsers on HTTPS can play it
// (avoids mixed-content blocking). Streaming pass-through, no buffering.
export const Route = createFileRoute("/api/public/radio/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const range = request.headers.get("range");
        const upstream = await fetch(UPSTREAM, {
          headers: {
            "User-Agent": "IndiRadioProxy/1.0",
            "Icy-MetaData": "0",
            ...(range ? { Range: range } : {}),
          },
        });
        const headers = new Headers();
        headers.set(
          "Content-Type",
          upstream.headers.get("content-type") ?? "audio/mpeg",
        );
        headers.set("Cache-Control", "no-store");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(upstream.body, {
          status: upstream.status,
          headers,
        });
      },
    },
  },
});