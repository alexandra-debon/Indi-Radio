/**
 * Analyse d'un « code d'intégration » collé par un administrateur.
 *
 * On n'enregistre JAMAIS de HTML brut : on extrait uniquement l'URL de la
 * source (`src` de l'iframe, ou l'URL collée telle quelle) et on la valide
 * contre une liste blanche de plateformes. Le rendu se fait ensuite dans une
 * iframe sandboxée maîtrisée par l'application.
 */

export const EMBED_ALLOWED_HOSTS: string[] = [
  "gamma.app",
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "open.spotify.com",
  "w.soundcloud.com",
  "soundcloud.com",
  "bandcamp.com",
  "canva.com",
  "substack.com",
  "widget.deezer.com",
  "deezer.com",
  "embed.music.apple.com",
  "music.apple.com",
  "online.fliphtml5.com",
  "fliphtml5.com",
  "docs.google.com",
  "drive.google.com",
  "calendar.google.com",
  "google.com",
  "issuu.com",
  "slideshare.net",
  "figma.com",
  "loom.com",
  "dailymotion.com",
  "geo.dailymotion.com",
  "anchor.fm",
  "podcasters.spotify.com",
  "mixcloud.com",
  "player.twitch.tv",
  "airtable.com",
  "notion.site",
  "typeform.com",
];

export const EMBED_PLATFORMS_LABEL =
  "Gamma, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Canva, Substack, Deezer, Apple Music, FlipHTML5, Google Docs/Slides, Issuu, Figma, Loom, Dailymotion, Mixcloud, Twitch, Airtable, Notion, Typeform";

export interface ParsedEmbed {
  url: string;
  /** Hauteur souhaitée en pixels si l'auteur en a fourni une. */
  height: number | null;
}

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return EMBED_ALLOWED_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}

function firstAttr(html: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = re.exec(html);
  if (!m) return null;
  return (m[2] ?? m[3] ?? "").trim() || null;
}

/**
 * Retourne l'embed normalisé, ou `null` si le contenu collé est vide.
 * Lève une erreur explicite quand la source n'est pas reconnue.
 */
export function parseEmbedCode(raw: string): ParsedEmbed | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  if (/<\s*script\b/i.test(input)) {
    throw new Error(
      `Les codes contenant <script> ne sont pas acceptés. Colle le code <iframe> ou l'adresse d'intégration (${EMBED_PLATFORMS_LABEL}).`,
    );
  }

  let src: string | null = null;
  let height: number | null = null;

  if (/<\s*iframe\b/i.test(input)) {
    src = firstAttr(input, "src") ?? firstAttr(input, "data-src");
    const rawHeight = firstAttr(input, "height");
    if (rawHeight && /^\d+$/.test(rawHeight)) height = parseInt(rawHeight, 10);
  } else if (/^https?:\/\//i.test(input) && !/\s/.test(input)) {
    src = input;
  }

  if (!src) {
    throw new Error(
      `Code d'intégration non reconnu. Colle un code <iframe> complet ou une adresse d'intégration (${EMBED_PLATFORMS_LABEL}).`,
    );
  }

  if (src.startsWith("//")) src = `https:${src}`;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new Error("L'adresse d'intégration est invalide.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Seules les adresses https sont acceptées.");
  }
  url.protocol = "https:";

  if (!hostAllowed(url.hostname)) {
    throw new Error(
      `Plateforme non autorisée (${url.hostname}). Plateformes acceptées : ${EMBED_PLATFORMS_LABEL}.`,
    );
  }

  if (height !== null) height = Math.min(Math.max(height, 200), 2000);

  return { url: url.toString(), height };
}

/** Validation silencieuse : renvoie l'embed ou `null` en cas d'erreur. */
export function safeParseEmbedCode(raw: string): ParsedEmbed | null {
  try {
    return parseEmbedCode(raw);
  } catch {
    return null;
  }
}
