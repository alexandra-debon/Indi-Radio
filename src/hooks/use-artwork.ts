import { useQuery } from "@tanstack/react-query";

/**
 * Récupère la pochette d'un morceau via l'API publique iTunes Search
 * (HTTPS, sans clé, CORS ouvert). Retourne null si aucun résultat.
 */
export function useArtwork(artist?: string | null, title?: string | null) {
  return useQuery({
    queryKey: ["artwork", artist, title],
    enabled: !!(artist && title),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const term = encodeURIComponent(`${artist} ${title}`.trim());
      const res = await fetch(
        `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as {
        results?: Array<{ artworkUrl100?: string }>;
      };
      const url = json.results?.[0]?.artworkUrl100;
      if (!url) return null;
      // Bump to a higher resolution square.
      return url.replace("100x100bb", "512x512bb").replace("100x100", "512x512");
    },
  });
}