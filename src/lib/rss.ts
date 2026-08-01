/**
 * Génération des flux RSS publics (chroniques, actus, clips, podcast).
 *
 * Les flux ne contiennent que du contenu déjà public, sont générés à la
 * demande depuis la base via la clé publishable (RLS anon) et utilisent
 * exactement les mêmes URL canoniques que les pages du site.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SITE_ORIGIN, canonicalUrl } from "@/lib/canonical";

export const FEED_LIMIT = 50;

/** Illustration par défaut des flux (logo carré). */
export const SITE_ORIGIN_ICON = `${SITE_ORIGIN}/icons/apple-touch-icon.png`;

export interface FeedItem {
  title: string;
  path: string;
  /** ISO date de publication réelle du contenu. */
  date?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  author?: string | undefined;
  /** Fichier audio joint (podcast). */
  audioUrl?: string | undefined;
  durationSeconds?: number | undefined;
  categories?: string[];
}

export function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** HTML/markup → texte brut tronqué, pour les extraits du flux. */
export function toExcerpt(input: string | null | undefined, max = 400): string {
  if (!input) return "";
  const text = input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Date de repli déterministe pour un contenu sans date exploitable :
 * dérivée du chemin canonique, donc stable d'une génération à l'autre.
 * Les agrégateurs ne verront jamais ces items "réapparaître" comme neufs.
 */
const FALLBACK_EPOCH = Date.UTC(2024, 0, 1, 12, 0, 0);

function fallbackDate(path: string): number {
  // Étale les items sans date sur ~2 ans, de façon reproductible.
  return FALLBACK_EPOCH + (hash(path) % 730) * 86_400_000;
}

/** Date de publication canonique d'un item (jamais la date de modification). */
export function itemDate(item: FeedItem): number {
  return parseDate(item.date) ?? fallbackDate(item.path);
}

/** lastBuildDate du flux : date du contenu le plus récent, sinon l'heure de génération. */
export function feedLastBuild(items: FeedItem[]): Date {
  const max = items.reduce((acc, i) => Math.max(acc, itemDate(i)), 0);
  return new Date(max || Date.now());
}

function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return SITE_ORIGIN + url;
  return null;
}

function hhmmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function guessAudioType(url: string): string {
  const clean = url.split("?")[0]!.toLowerCase();
  if (clean.endsWith(".m4a")) return "audio/mp4";
  if (clean.endsWith(".ogg") || clean.endsWith(".oga")) return "audio/ogg";
  if (clean.endsWith(".wav")) return "audio/wav";
  if (clean.endsWith(".aac")) return "audio/aac";
  return "audio/mpeg";
}

export interface FeedOptions {
  title: string;
  description: string;
  /** Chemin de la page HTML correspondante (ex: /chroniques). */
  link: string;
  /** Chemin du flux lui-même (ex: /rss-chroniques.xml). */
  selfPath: string;
  language?: string;
  /** Active les balises iTunes (flux podcast). */
  podcast?: {
    author: string;
    ownerEmail: string;
    image: string;
    category: string;
    explicit?: boolean;
  };
}

export function renderFeed(opts: FeedOptions, items: FeedItem[]): string {
  const self = `${SITE_ORIGIN}${opts.selfPath}`;
  const lastBuild = feedLastBuild(items);

  const xmlItems = items
    .map((item) => {
      const url = canonicalUrl(item.path);
      const img = absolute(item.image);
      const audio = absolute(item.audioUrl);
      const pub = new Date(itemDate(item)).toUTCString();
      const lines: (string | null)[] = [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${pub}</pubDate>`,
        opts.podcast ? `      <itunes:episodeType>full</itunes:episodeType>` : null,
        item.author ? `      <dc:creator>${escapeXml(item.author)}</dc:creator>` : null,
        item.description
          ? `      <description>${escapeXml(item.description)}</description>`
          : null,
        ...(item.categories ?? []).map((c) => `      <category>${escapeXml(c)}</category>`),
        img ? `      <media:content url="${escapeXml(img)}" medium="image"/>` : null,
        img && !audio ? `      <enclosure url="${escapeXml(img)}" type="image/jpeg" length="0"/>` : null,
        audio
          ? `      <enclosure url="${escapeXml(audio)}" type="${guessAudioType(audio)}" length="0"/>`
          : null,
        opts.podcast && img ? `      <itunes:image href="${escapeXml(img)}"/>` : null,
        opts.podcast && item.durationSeconds
          ? `      <itunes:duration>${hhmmss(item.durationSeconds)}</itunes:duration>`
          : null,
        opts.podcast && item.description
          ? `      <itunes:summary>${escapeXml(item.description)}</itunes:summary>`
          : null,
        opts.podcast ? `      <itunes:explicit>no</itunes:explicit>` : null,
        "    </item>",
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n");

  const p = opts.podcast;
  const head: (string | null)[] = [
    `    <title>${escapeXml(opts.title)}</title>`,
    `    <link>${escapeXml(canonicalUrl(opts.link))}</link>`,
    `    <description>${escapeXml(opts.description)}</description>`,
    `    <language>${opts.language ?? "fr-FR"}</language>`,
    `    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>`,
    `    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>`,
    `    <pubDate>${lastBuild.toUTCString()}</pubDate>`,
    `    <generator>InDi RaDio</generator>`,
    `    <image>`,
    `      <url>${SITE_ORIGIN}/icons/apple-touch-icon.png</url>`,
    `      <title>${escapeXml(opts.title)}</title>`,
    `      <link>${escapeXml(canonicalUrl(opts.link))}</link>`,
    `    </image>`,
    p ? `    <itunes:author>${escapeXml(p.author)}</itunes:author>` : null,
    p ? `    <itunes:summary>${escapeXml(opts.description)}</itunes:summary>` : null,
    p ? `    <itunes:type>episodic</itunes:type>` : null,
    p ? `    <itunes:explicit>${p.explicit ? "yes" : "no"}</itunes:explicit>` : null,
    p ? `    <itunes:image href="${escapeXml(p.image)}"/>` : null,
    p ? `    <itunes:category text="${escapeXml(p.category)}"/>` : null,
    p
      ? `    <itunes:owner>\n      <itunes:name>${escapeXml(p.author)}</itunes:name>\n      <itunes:email>${escapeXml(p.ownerEmail)}</itunes:email>\n    </itunes:owner>`
      : null,
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">`,
    `  <channel>`,
    ...head.filter(Boolean),
    xmlItems,
    `  </channel>`,
    `</rss>`,
    "",
  ].join("\n");
}

/** En-têtes cache + conditional GET, alignés sur ceux des sitemaps. */
export function feedResponse(request: Request, body: string): Response {
  const lastModified = new Date().toUTCString();
  const headers = new Headers();
  headers.set("Content-Type", "application/rss+xml; charset=utf-8");
  headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
  );
  const etag = `W/"${body.length.toString(16)}-${hash(body).toString(16)}"`;
  headers.set("ETag", etag);
  headers.set("Last-Modified", lastModified);
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/*                        Chargement des contenus                      */
/* ------------------------------------------------------------------ */

export async function loadChroniques(): Promise<FeedItem[]> {
  try {
    const sb = publicClient();
    const { data } = await sb
      .from("album_reviews")
      .select("slug, title, artist, excerpt, content, cover_url, created_at, updated_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT);
    return (data ?? []).map((r) => ({
      title: `${r.artist} — ${r.title}`,
      path: `/chroniques/${r.slug}`,
      date: r.created_at ?? undefined,
      description: toExcerpt(r.excerpt || r.content),
      image: r.cover_url ?? undefined,
      categories: ["Chroniques"],
    }));
  } catch {
    return [];
  }
}

export async function loadActus(): Promise<FeedItem[]> {
  try {
    const sb = publicClient();
    const { data } = await sb
      .from("news_posts")
      .select("id, title, content, image_url, image_urls, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT);
    return (data ?? []).map((r) => ({
      title: r.title,
      path: `/actus/${r.id}`,
      date: r.created_at ?? undefined,
      description: toExcerpt(r.content),
      image: r.image_url ?? (r.image_urls?.[0] as string | undefined),
      categories: ["Actus"],
    }));
  } catch {
    return [];
  }
}

export async function loadClips(): Promise<FeedItem[]> {
  try {
    const sb = publicClient();
    const { data } = await sb
      .from("clip_entries")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT);
    return (data ?? []).map((r) => ({
      title: r.title,
      path: `/clips/${r.id}`,
      date: r.created_at ?? undefined,
      description: toExcerpt(r.body),
      categories: ["Clips"],
    }));
  } catch {
    return [];
  }
}

/** Épisodes disposant d'un fichier audio direct (diffusables en podcast). */
export async function loadEpisodes(onlyAudio = true): Promise<FeedItem[]> {
  try {
    const sb = publicClient();
    const { data } = await sb
      .from("episodes")
      .select("id, title, description, audio_url, cover_url, duration_seconds, published_at")
      .order("published_at", { ascending: false })
      .limit(FEED_LIMIT * 2);
    const rows = (data ?? []).filter((r) => (onlyAudio ? !!r.audio_url : true));
    return rows.slice(0, FEED_LIMIT).map((r) => ({
      title: r.title,
      path: `/episodes/${r.id}`,
      date: r.published_at ?? undefined,
      description: toExcerpt(r.description),
      image: r.cover_url ?? undefined,
      audioUrl: r.audio_url ?? undefined,
      durationSeconds: r.duration_seconds ?? undefined,
      categories: ["Épisodes"],
    }));
  } catch {
    return [];
  }
}

export async function loadShows(): Promise<FeedItem[]> {
  try {
    const sb = publicClient();
    const { data } = await sb
      .from("shows")
      .select("id, title, description, cover_url, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT);
    return (data ?? []).map((r) => ({
      title: r.title,
      path: `/emissions/${r.id}`,
      date: r.created_at ?? undefined,
      description: toExcerpt(r.description),
      image: r.cover_url ?? undefined,
      categories: ["Émissions"],
    }));
  } catch {
    return [];
  }
}

export function sortByDate(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0),
  );
}
