// URL utilities to detect embeddable media (YouTube, Vimeo) and extract URLs from free text.

export type MediaEmbed =
  | { kind: "youtube"; type: "video"; id: string; embedUrl: string; originalUrl: string }
  | { kind: "youtube"; type: "playlist"; id: string; embedUrl: string; originalUrl: string }
  | { kind: "vimeo"; type: "video"; id: string; embedUrl: string; originalUrl: string }
  | {
      kind: "spotify";
      type: "audio";
      id: string;
      embedUrl: string;
      originalUrl: string;
      height: number;
    }
  | {
      kind: "soundcloud";
      type: "audio";
      id: string;
      embedUrl: string;
      originalUrl: string;
      height: number;
    };

// Matches most URLs including query strings; keeps trailing punctuation out.
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;!?)\]}]/gi;

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const set = new Set<string>();
  const matches = text.match(URL_RE);
  if (matches) for (const m of matches) set.add(m);
  return Array.from(set);
}

export function parseMediaUrl(rawUrl: string): MediaEmbed | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube playlist
  if ((host === "youtube.com" || host === "m.youtube.com") && u.pathname === "/playlist") {
    const listId = u.searchParams.get("list");
    if (listId) {
      return {
        kind: "youtube",
        type: "playlist",
        id: listId,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}`,
        originalUrl: rawUrl,
      };
    }
  }

  // YouTube watch / shorts / embed / youtu.be
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return ytVideo(id, u.searchParams.get("list"), rawUrl);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      if (id) return ytVideo(id, u.searchParams.get("list"), rawUrl);
    }
    const shortsMatch = u.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch) return ytVideo(shortsMatch[1], null, rawUrl);
    const embedMatch = u.pathname.match(/^\/embed\/([\w-]+)/);
    if (embedMatch) return ytVideo(embedMatch[1], u.searchParams.get("list"), rawUrl);
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/);
    if (m) {
      const id = m[1];
      return {
        kind: "vimeo",
        type: "video",
        id,
        embedUrl: `https://player.vimeo.com/video/${id}`,
        originalUrl: rawUrl,
      };
    }
  }

  // Spotify (titre, album, playlist, épisode, podcast)
  if (host === "open.spotify.com" || host === "spotify.com") {
    const m = u.pathname.match(
      /\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/,
    );
    if (m) {
      const [, type, id] = m;
      const tall = type === "album" || type === "playlist" || type === "artist";
      return {
        kind: "spotify",
        type: "audio",
        id: `${type}:${id}`,
        embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
        originalUrl: rawUrl,
        height: tall ? 352 : 152,
      };
    }
  }

  // SoundCloud (titres, sets, profils) — le player prend l'URL publique
  if (host === "soundcloud.com" || host === "m.soundcloud.com" || host === "on.soundcloud.com") {
    const path = u.pathname.replace(/\/+$/, "");
    if (path.length > 1) {
      const canonical = `https://soundcloud.com${path}`;
      const isSet = path.includes("/sets/");
      return {
        kind: "soundcloud",
        type: "audio",
        id: path.slice(1),
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          canonical,
        )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`,
        originalUrl: rawUrl,
        height: isSet ? 320 : 166,
      };
    }
  }

  return null;
}

/** Vrai si le texte contient au moins un lien musical (streaming / plateforme). */
export function hasMusicLink(text: string): boolean {
  for (const url of extractUrls(text || "")) {
    const m = parseMediaUrl(url);
    if (m && (m.kind === "spotify" || m.kind === "soundcloud")) return true;
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue;
    }
    if (
      host.endsWith("bandcamp.com") ||
      host === "music.apple.com" ||
      host === "deezer.com" ||
      host === "www.deezer.com" ||
      host === "tidal.com" ||
      host === "music.youtube.com" ||
      host === "open.spotify.com" ||
      host === "soundcloud.com"
    ) {
      return true;
    }
    if (m && m.kind === "youtube") return true;
  }
  return false;
}

function ytVideo(id: string, list: string | null, rawUrl: string): MediaEmbed {
  const params = new URLSearchParams();
  if (list) params.set("list", list);
  const qs = params.toString();
  return {
    kind: "youtube",
    type: "video",
    id,
    embedUrl: `https://www.youtube.com/embed/${id}${qs ? `?${qs}` : ""}`,
    originalUrl: rawUrl,
  };
}

export function isValidVideoUrl(rawUrl: string): boolean {
  return parseMediaUrl(rawUrl) !== null;
}

// Split "media URLs" vs "generic URLs" from a chunk of text.
export function scanText(text: string): { media: MediaEmbed[]; other: string[] } {
  const media: MediaEmbed[] = [];
  const other: string[] = [];
  const seenMedia = new Set<string>();
  const seenOther = new Set<string>();
  for (const url of extractUrls(text)) {
    const m = parseMediaUrl(url);
    if (m) {
      const key = `${m.kind}:${m.type}:${m.id}`;
      if (!seenMedia.has(key)) { seenMedia.add(key); media.push(m); }
    } else {
      if (!seenOther.has(url)) { seenOther.add(url); other.push(url); }
    }
  }
  return { media, other };
}

// Remove URLs that resolve to an embeddable media (YouTube/Vimeo) from a text,
// so the raw link doesn't appear next to the inline player.
export function stripMediaUrls(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(URL_RE, (url) => (parseMediaUrl(url) ? "" : url));
  return cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}