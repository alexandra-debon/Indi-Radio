import { useQuery } from "@tanstack/react-query";
import { findArtwork } from "@/lib/artwork.functions";

/**
 * Pochette d'un morceau via iTunes Search (proxifié côté serveur — pas de CORS).
 */
export function useArtwork(artist?: string | null, title?: string | null) {
  return useQuery({
    queryKey: ["artwork", artist, title],
    enabled: !!(artist && title),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { url } = await findArtwork({ data: { artist: artist!, title: title! } });
      return url;
    },
  });
}