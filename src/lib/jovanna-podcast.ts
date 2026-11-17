export type PodcastEpisode = {
  slug: string;
  title: string;
  host: string;
  episode: number;
  publishedAt: string;
  durationSeconds: number;
  /** Source audio lue dans l'application (jamais proposée en téléchargement). */
  audioUrl: string;
  audioType: string;
  listeningUrls: { fr: string; en: string };
};

export const JOVANNA_EPISODE = {
  slug: "cetait-mieux-demain-01",
  title: "C’était mieux demain",
  host: "Jovanna",
  episode: 1,
  publishedAt: "2026-11-13",
  durationSeconds: 3734,
  audioUrl:
    "https://indi-radio.indi-art-culture.com:2170/media/podcasts/Server_1/c%C3%A9tait-mieux-demain-jovanna/mix%20jovanna.m4a",
  audioType: "audio/mp4",
  listeningUrls: {
    fr: "https://www.indi-art-culture.com/cetait-mieux-demain/episode-01",
    en: "https://www.indi-art-culture.com/en/cetait-mieux-demain/episode-01",
  },
} as const satisfies PodcastEpisode;

/** Registre des épisodes intégrés : ajouter les prochains épisodes ici. */
export const IN_APP_EPISODES: readonly PodcastEpisode[] = [JOVANNA_EPISODE];

export function findInAppEpisode(slug: string) {
  return IN_APP_EPISODES.find((e) => e.slug === slug);
}

export function jovannaListeningUrl(lang: string) {
  return lang === "en" ? JOVANNA_EPISODE.listeningUrls.en : JOVANNA_EPISODE.listeningUrls.fr;
}
