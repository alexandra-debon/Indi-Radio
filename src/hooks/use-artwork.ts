import { useQuery } from "@tanstack/react-query";

/**
 * Pochette d'un morceau via iTunes Search (endpoint public — fonctionne sans connexion).
 */
export function useArtwork(artist?: string | null, title?: string | null) {
  return useQuery({
    queryKey: ["artwork", artist, title],
    enabled: !!(artist && title),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const params = new URLSearchParams({ artist: artist!, title: title! });
      const res = await fetch(`/api/public/radio/artwork?${params.toString()}`);
      if (!res.ok) return null;
      const { url } = (await res.json()) as { url: string | null };
      return url;
    },
  });
}