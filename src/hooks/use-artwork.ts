import { useQuery } from "@tanstack/react-query";

/**
 * Pochette d'un morceau via iTunes Search (endpoint public — fonctionne sans connexion).
 */
export function useArtwork(artist?: string | null, title?: string | null) {
  return useQuery({
    queryKey: ["artwork", "v4", artist, title],
    enabled: !!(artist && title),
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    // Re-attempt on remount / focus / reconnect so a transient miss on mobile
    // (backgrounded tab, flaky connection, CDN 403) doesn't stick for the session.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 6,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
    queryFn: async () => {
      const params = new URLSearchParams({ artist: artist!, title: title! });
      const res = await fetch(`/api/public/radio/artwork?${params.toString()}`);
      if (!res.ok) throw new Error("artwork lookup failed");
      const { url } = (await res.json()) as { url: string | null };
      // Treat "no artwork" as retryable: providers are flaky and often succeed on retry.
      if (!url) throw new Error("artwork not found");
      return url;
    },
  });
}