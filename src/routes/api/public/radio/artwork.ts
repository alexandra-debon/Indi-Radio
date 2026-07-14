import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
} as const;

const HIT_CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const MISS_CACHE = "public, max-age=60, s-maxage=300";

async function fetchWithRetry(url: string, init: RequestInit, tries = 3): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return res;
    } catch {
      // network error — retry
    }
    await new Promise((r) => setTimeout(r, 150 * (i + 1)));
  }
  return null;
}

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
  const res = await fetchWithRetry(
    `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=10`,
    { headers: { "User-Agent": "IndiRadio/1.0" } },
  );
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    results?: Array<{ artworkUrl100?: string; artistName?: string; trackName?: string }>;
  } | null;
  const results = json?.results ?? [];
  const wantArtist = keyPart(artist);
  const wantTitle = keyPart(title);
  const scored = results
    .map((r) => {
      const a = keyPart(r.artistName ?? "");
      const t = keyPart(r.trackName ?? "");
      let score = 0;
      if (a === wantArtist) score += 4; else if (a.includes(wantArtist) || wantArtist.includes(a)) score += 2;
      if (t === wantTitle) score += 4; else if (t.includes(wantTitle) || wantTitle.includes(t)) score += 2;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  return bestArtwork(scored[0]?.r?.artworkUrl100 ?? results[0]?.artworkUrl100);
}

async function searchDeezerArtwork(artist: string, title: string, exact = true) {
  const query = encodeURIComponent(exact ? `artist:"${artist}" track:"${title}"` : `${artist} ${title}`);
  if (!query) return null;
  const res = await fetchWithRetry(`https://api.deezer.com/search?q=${query}&limit=5`, {
    headers: { "User-Agent": "IndiRadio/1.0" },
  });
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    data?: Array<{ album?: { cover_xl?: string; cover_big?: string; cover_medium?: string } }>;
  } | null;
  const album = json?.data?.[0]?.album;
  return album?.cover_xl ?? album?.cover_big ?? album?.cover_medium ?? null;
}

async function searchMusicBrainzArtwork(artist: string, title: string) {
  const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
  const res = await fetchWithRetry(
    `https://musicbrainz.org/ws/2/recording/?query=${q}&fmt=json&limit=5`,
    { headers: { "User-Agent": "IndiRadio/1.0 (contact@indi-art-culture.com)" } },
  );
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    recordings?: Array<{ releases?: Array<{ id: string }> }>;
  } | null;
  for (const rec of json?.recordings ?? []) {
    for (const rel of rec.releases ?? []) {
      const cover = await fetchWithRetry(`https://coverartarchive.org/release/${rel.id}/front-500`, {}, 1);
      if (cover && cover.ok) return cover.url;
    }
  }
  return null;
}

async function searchAllArtwork(artist: string, title: string) {
  const forced = forcedArtwork(artist, title);
  if (forced) return forced;

  for (const artistVariant of artistVariants(artist)) {
    for (const titleVariant of titleVariants(title)) {
      const artworkUrl =
        (await searchArtwork(artistVariant, titleVariant)) ??
        (await searchDeezerArtwork(artistVariant, titleVariant)) ??
        (await searchDeezerArtwork(artistVariant, titleVariant, false)) ??
        (await searchMusicBrainzArtwork(artistVariant, titleVariant));
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

          return Response.json(
            { url: artworkUrl },
            { headers: { ...CORS_HEADERS, "Cache-Control": artworkUrl ? HIT_CACHE : MISS_CACHE } },
          );
        } catch {
          return Response.json(
            { url: null },
            { headers: { ...CORS_HEADERS, "Cache-Control": MISS_CACHE } },
          );
        }
      },
    },
  },
});