export const JOVANNA_EPISODE = {
  title: "C’était mieux demain",
  host: "Jovanna",
  episode: 1,
  publishedAt: "2026-11-13",
  durationSeconds: 3734,
  listeningUrls: {
    fr: "https://www.indi-art-culture.com/cetait-mieux-demain/episode-01",
    en: "https://www.indi-art-culture.com/en/cetait-mieux-demain/episode-01",
  },
} as const;

export function jovannaListeningUrl(lang: string) {
  return lang === "en" ? JOVANNA_EPISODE.listeningUrls.en : JOVANNA_EPISODE.listeningUrls.fr;
}