import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
} as const;

const HIT_CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
// Keep MISS short so a transient provider failure doesn't stick — client retries hit fresh data.
const MISS_CACHE = "public, max-age=15, s-maxage=30, stale-while-revalidate=60";

type Attempt = { provider: string; ok: boolean; ms: number; error?: string };

async function timed<T>(provider: string, attempts: Attempt[], fn: () => Promise<T | null>) {
  const t0 = Date.now();
  try {
    const result = await fn();
    attempts.push({ provider, ok: !!result, ms: Date.now() - t0 });
    return result;
  } catch (e) {
    attempts.push({ provider, ok: false, ms: Date.now() - t0, error: String((e as Error)?.message ?? e).slice(0, 200) });
    return null;
  }
}

async function logLookup(row: {
  artist: string; title: string; source: string | null; found: boolean;
  duration_ms: number; attempts: Attempt[]; error?: string | null;
}) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/artwork_lookups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch {
    // best-effort logging
  }
  if (!row.found) {
    console.warn("[artwork] MISS", { artist: row.artist, title: row.title, attempts: row.attempts });
  }
}

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
  const noThe = artist.replace(/^the\s+/i, "");
  const ascii = artist.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return unique([artist, firstArtist, noThe, ascii]);
}

function titleVariants(title: string) {
  const ascii = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return unique([
    title,
    title.replace(/\s[-–—].*$/, ""),
    title.replace(/[’`]/g, "'"),
    title.replace(/\s*\/\s*.*$/, ""),
    clean(title),
    ascii,
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
  const res = await fetchWithRetry(`https://api.deezer.com/search?q=${query}&limit=15`, {
    headers: { "User-Agent": "IndiRadio/1.0" },
  });
  if (!res || !res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    data?: Array<{
      title?: string;
      artist?: { name?: string };
      album?: { cover_xl?: string; cover_big?: string; cover_medium?: string };
    }>;
  } | null;
  const results = json?.data ?? [];
  const wantArtist = keyPart(artist);
  const wantTitle = keyPart(title);
  const scored = results
    .map((r) => {
      const a = keyPart(r.artist?.name ?? "");
      const t = keyPart(r.title ?? "");
      let score = 0;
      if (a === wantArtist) score += 4;
      else if (a && (a.includes(wantArtist) || wantArtist.includes(a))) score += 2;
      if (t === wantTitle) score += 4;
      else if (t && (t.includes(wantTitle) || wantTitle.includes(t))) score += 2;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  const album = (scored[0]?.score ?? 0) >= 2 ? scored[0]?.r.album : results[0]?.album;
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

async function searchAllArtwork(artist: string, title: string, attempts: Attempt[]) {
  const forced = forcedArtwork(artist, title);
  if (forced) { attempts.push({ provider: "forced", ok: true, ms: 0 }); return { url: forced, source: "forced" }; }

  for (const artistVariant of artistVariants(artist)) {
    for (const titleVariant of titleVariants(title)) {
      const it = await timed("itunes", attempts, () => searchArtwork(artistVariant, titleVariant));
      if (it) return { url: it, source: "itunes" };
      const dz = await timed("deezer_exact", attempts, () => searchDeezerArtwork(artistVariant, titleVariant));
      if (dz) return { url: dz, source: "deezer_exact" };
      const dz2 = await timed("deezer_loose", attempts, () => searchDeezerArtwork(artistVariant, titleVariant, false));
      if (dz2) return { url: dz2, source: "deezer_loose" };
      const mb = await timed("musicbrainz", attempts, () => searchMusicBrainzArtwork(artistVariant, titleVariant));
      if (mb) return { url: mb, source: "musicbrainz" };
    }
  }
  return { url: null as string | null, source: null as string | null };
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

        const t0 = Date.now();
        const attempts: Attempt[] = [];
        try {
          const forcedOriginal = forcedArtwork(originalArtist, originalTitle);
          const result = forcedOriginal
            ? { url: forcedOriginal, source: "forced_original" }
            : await searchAllArtwork(artist, title, attempts);

          void logLookup({
            artist: originalArtist || artist,
            title: originalTitle || title,
            source: result.source,
            found: !!result.url,
            duration_ms: Date.now() - t0,
            attempts,
          });

          return Response.json(
            { url: result.url },
            { headers: { ...CORS_HEADERS, "Cache-Control": result.url ? HIT_CACHE : MISS_CACHE } },
          );
        } catch (e) {
          void logLookup({
            artist: originalArtist || artist,
            title: originalTitle || title,
            source: null,
            found: false,
            duration_ms: Date.now() - t0,
            attempts,
            error: String((e as Error)?.message ?? e).slice(0, 300),
          });
          return Response.json(
            { url: null },
            { headers: { ...CORS_HEADERS, "Cache-Control": MISS_CACHE } },
          );
        }
      },
    },
  },
});