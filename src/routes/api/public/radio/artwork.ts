import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store, max-age=0",
} as const;

const FORCED_ARTWORK: Record<string, string> = {
  "daft punk|rollin scratchin":
    "https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/34/8d/c7/348dc71c-d75e-9baf-671a-994e9e74b018/dj.pimdxdmf.jpg/512x512bb.jpg",
  "will sellenraad eric mcpherson rene hart|alter ego":
    "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/fa/aa/d6/faaad670-7149-c44c-cba2-af3bf47a46fa/605491104215.jpg/512x512bb.jpg",
};

function keyPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function forcedArtwork(artist: string, title: string) {
  return FORCED_ARTWORK[`${keyPart(artist)}|${keyPart(title)}`] ?? null;
}

function clean(value: string | null) {
  return (value ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(remaster(?:ed)?|radio edit|edit|single version|explicit|feat\.?|featuring)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function artistVariants(artist: string) {
  const firstArtist = artist.split(/,|&|\band\b|\+|\bavec\b/iu)[0] ?? artist;
  return unique([artist, firstArtist]);
}

function titleVariants(title: string) {
  return unique([
    title,
    title.replace(/\s[-–—].*$/, ""),
    title.replace(/[’`]/g, "'"),
    clean(title),
  ]);
}

function bestArtwork(raw?: string | null) {
  return raw ? raw.replace("100x100bb", "512x512bb").replace("100x100", "512x512") : null;
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

  return bestArtwork(json.results?.[0]?.artworkUrl100);
}

async function searchDeezerArtwork(artist: string, title: string, exact = true) {
  const query = encodeURIComponent(exact ? `artist:"${artist}" track:"${title}"` : `${artist} ${title}`);
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

async function searchAllArtwork(artist: string, title: string) {
  const forced = forcedArtwork(artist, title);
  if (forced) return forced;

  for (const artistVariant of artistVariants(artist)) {
    for (const titleVariant of titleVariants(title)) {
      const artworkUrl =
        (await searchArtwork(artistVariant, titleVariant)) ??
        (await searchDeezerArtwork(artistVariant, titleVariant)) ??
        (await searchDeezerArtwork(artistVariant, titleVariant, false));
      if (artworkUrl) return artworkUrl;
    }
  }

  return null;
}

export const Route = createFileRoute("/api/public/radio/artwork")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const originalArtist = url.searchParams.get("artist") ?? "";
        const originalTitle = url.searchParams.get("title") ?? "";
        const artist = clean(originalArtist);
        const title = clean(originalTitle);

        if (!artist || !title) {
          return Response.json({ url: null }, { headers: CORS_HEADERS });
        }

        try {
          const artworkUrl =
            forcedArtwork(originalArtist, originalTitle) ??
            (await searchAllArtwork(artist, title));

          return Response.json({ url: artworkUrl }, { headers: CORS_HEADERS });
        } catch {
          return Response.json({ url: null }, { headers: CORS_HEADERS });
        }
      },
    },
  },
});