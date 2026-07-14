import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
} as const;

function clean(value: string | null) {
  return (value ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(remaster(?:ed)?|radio edit|edit|single version|explicit|feat\.?|featuring)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchArtwork(artist: string, title: string) {
  const term = encodeURIComponent(`${artist} ${title}`.trim());
  if (!term) return null;

  const res = await fetch(
    `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5`,
    { headers: { "User-Agent": "IndiRadio/1.0" } },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as {
    results?: Array<{ artworkUrl100?: string; artistName?: string; trackName?: string }>;
  };

  const raw = json.results?.[0]?.artworkUrl100 ?? null;
  return raw ? raw.replace("100x100bb", "512x512bb").replace("100x100", "512x512") : null;
}

async function searchDeezerArtwork(artist: string, title: string) {
  const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
  if (!query) return null;

  const res = await fetch(`https://api.deezer.com/search?q=${query}&limit=3`, {
    headers: { "User-Agent": "IndiRadio/1.0" },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: Array<{ album?: { cover_xl?: string; cover_big?: string; cover_medium?: string } }>;
  };

  const album = json.data?.[0]?.album;
  return album?.cover_xl ?? album?.cover_big ?? album?.cover_medium ?? null;
}

export const Route = createFileRoute("/api/public/radio/artwork")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const artist = clean(url.searchParams.get("artist"));
        const title = clean(url.searchParams.get("title"));

        if (!artist || !title) {
          return Response.json({ url: null }, { headers: CORS_HEADERS });
        }

        try {
          const artworkUrl =
            (await searchArtwork(artist, title)) ??
            (await searchArtwork(artist, title.replace(/\s[-–—].*$/, ""))) ??
            (await searchDeezerArtwork(artist, title)) ??
            (await searchDeezerArtwork(artist, title.replace(/\s[-–—].*$/, "")));

          return Response.json({ url: artworkUrl }, { headers: CORS_HEADERS });
        } catch {
          return Response.json({ url: null }, { headers: CORS_HEADERS });
        }
      },
    },
  },
});