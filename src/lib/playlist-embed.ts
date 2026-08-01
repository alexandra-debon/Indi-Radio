/**
 * Les codes d'intégration Spotify / Apple Music collés par l'admin sont
 * stockés bruts mais JAMAIS injectés en HTML. On en extrait uniquement l'URL
 * de l'iframe, validée contre une allowlist stricte.
 */

const ALLOWED_HOSTS: Record<"spotify" | "apple", string[]> = {
  spotify: ["open.spotify.com"],
  apple: ["embed.music.apple.com", "music.apple.com"],
};

export type PlaylistPlatform = "spotify" | "apple";

function firstUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const srcMatch = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
  const candidate = srcMatch?.[1] ?? (/^https?:\/\//i.test(trimmed) ? trimmed.split(/\s+/)[0] : null);
  return candidate ?? null;
}

/** Retourne une URL d'embed sûre, ou null si le code est invalide. */
export function extractEmbedUrl(raw: string | null | undefined, platform: PlaylistPlatform): string | null {
  if (!raw) return null;
  const candidate = firstUrl(raw);
  if (!candidate) return null;
  let url: URL;
  try {
    url = new URL(candidate, "https://example.invalid");
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS[platform].includes(url.hostname)) return null;

  // Normalise vers le domaine d'embed d'Apple Music.
  if (platform === "apple" && url.hostname === "music.apple.com") {
    url.hostname = "embed.music.apple.com";
  }
  return url.toString();
}

export function platformLabel(platform: PlaylistPlatform): string {
  return platform === "spotify" ? "Spotify" : "Apple Music";
}