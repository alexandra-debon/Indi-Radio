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
  /** Identifiant d'émission du compteur d'écoutes (défaut « 1 »). */
  statsShowId?: string;
  listeningUrls: { fr: string; en: string };
  /** Chapitres (début en secondes), d’après la programmation officielle. */
  chapters?: readonly PodcastChapter[];
};

export type PodcastChapter = { start: number; title: string; artist?: string };

export type PodcastEpisodePreview = Pick<PodcastEpisode, "slug" | "title" | "host" | "episode"> & {
  /** Date et heure de diffusion annoncées, avec le fuseau de Paris. */
  scheduledAt: string;
};

const ts = (m: number, s: number) => m * 60 + s;

/** Index du chapitre en cours à l’instant `time` (-1 avant le premier). */
export function chapterIndexAt(chapters: readonly PodcastChapter[], time: number) {
  let i = -1;
  for (let k = 0; k < chapters.length; k++) if (chapters[k].start <= time) i = k;
  return i;
}

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
  chapters: [
    { start: 0, title: "Ouverture" },
    { start: ts(1, 44), title: "Ummon", artist: "SLIFT" },
    { start: ts(9, 1), title: "Heaven in Stereo", artist: "Shilpa Ray" },
    { start: ts(13, 3), title: "Polaroid", artist: "Metro Verlaine" },
    { start: ts(16, 33), title: "Un homme et une femme", artist: "Loa Mercury" },
    { start: ts(21, 45), title: "Fragile", artist: "Bandit Bandit × Last Train" },
    { start: ts(28, 48), title: "Maux", artist: "Last Train × Bandit Bandit" },
    { start: ts(33, 50), title: "Poison", artist: "Lamu" },
    { start: ts(39, 30), title: "Fx of Love", artist: "Rodolphe Burger" },
    { start: ts(44, 54), title: "Cowboy Kirk", artist: "All Them Witches" },
    { start: ts(51, 44), title: "Rabbit Hole", artist: "False Heads" },
    { start: ts(55, 43), title: "Monsters", artist: "Nova Twins" },
    { start: ts(59, 14), title: "Trainer en costard", artist: "Pastis Agressif" },
  ],
} as const satisfies PodcastEpisode;

export const JOVANNA_EPISODE_2_PREVIEW = {
  slug: "cetait-mieux-demain-02",
  title: "C’était mieux demain",
  host: "Jovanna",
  episode: 2,
  scheduledAt: "2026-11-27T21:00:00+01:00",
} as const satisfies PodcastEpisodePreview;

export const PODCAST_EPISODE_PREVIEWS: readonly PodcastEpisodePreview[] = [JOVANNA_EPISODE_2_PREVIEW];

/** Registre des épisodes intégrés : ajouter les prochains épisodes ici. */
export const IN_APP_EPISODES: readonly PodcastEpisode[] = [JOVANNA_EPISODE];

export function findInAppEpisode(slug: string) {
  return IN_APP_EPISODES.find((e) => e.slug === slug);
}

const STATS_BASE = "https://podcast-indi-art-culture.netlify.app/e";

/** Adresse du compteur Netlify pour la lecture en ligne (redirige vers le fichier d'origine). */
export function podcastStatsUrl(episode: PodcastEpisode) {
  const bytes = new TextEncoder().encode(episode.audioUrl);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const ext = episode.audioUrl.split("?")[0]?.match(/\.[a-z0-9]+$/i)?.[0] ?? ".m4a";
  return `${STATS_BASE}/${episode.statsShowId ?? "1"}/${b64}${ext}?app=hub`;
}

/** Adresse du relevé du nombre d'écoutes d'un épisode (JSON { "ecoutes": number }). */
export function podcastListenCountUrl(episode: PodcastEpisode) {
  return `https://podcast-indi-art-culture.netlify.app/compteur.json?audio=${encodeURIComponent(episode.audioUrl)}`;
}

export function jovannaListeningUrl(lang: string) {
  return lang === "en" ? JOVANNA_EPISODE.listeningUrls.en : JOVANNA_EPISODE.listeningUrls.fr;
}

/** Normalise un titre d'émission pour relier émission radio et podcast. */
export function showKey(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'`]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

/** Épisodes podcast intégrés issus d'une émission radio (même titre). */
export function inAppEpisodesForShow(showTitle: string) {
  const k = showKey(showTitle);
  return IN_APP_EPISODES.filter((e) => showKey(e.title) === k).sort((a, b) => b.episode - a.episode);
}

/** Annonces d'épisodes à venir associées à une émission radio. */
export function episodePreviewsForShow(showTitle: string) {
  const k = showKey(showTitle);
  return PODCAST_EPISODE_PREVIEWS.filter((e) => showKey(e.title) === k).sort((a, b) => b.episode - a.episode);
}
