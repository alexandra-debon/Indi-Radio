import { createServerFn } from "@tanstack/react-start";

/**
 * Recherche une pochette de disque via iTunes Search API (public, sans clé).
 * Exécuté côté serveur pour contourner l'absence de CORS.
 */
export const findArtwork = createServerFn({ method: "GET" })
  .inputValidator((data: { artist: string; title: string }) => data)
  .handler(async ({ data }) => {
    const term = encodeURIComponent(`${data.artist} ${data.title}`.trim());
    if (!term) return { url: null as string | null };
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`,
        { headers: { "User-Agent": "IndiRadio/1.0" } },
      );
      if (!res.ok) return { url: null };
      const json = (await res.json()) as {
        results?: Array<{ artworkUrl100?: string }>;
      };
      const raw = json.results?.[0]?.artworkUrl100 ?? null;
      const url = raw
        ? raw.replace("100x100bb", "512x512bb").replace("100x100", "512x512")
        : null;
      return { url };
    } catch {
      return { url: null };
    }
  });