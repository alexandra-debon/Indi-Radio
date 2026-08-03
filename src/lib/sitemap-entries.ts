import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/actus", changefreq: "daily", priority: "0.9" },
  { path: "/emissions", changefreq: "weekly", priority: "0.8" },
  { path: "/chart", changefreq: "daily", priority: "0.7" },
  { path: "/podcasts", changefreq: "weekly", priority: "0.7" },
  { path: "/chroniques", changefreq: "weekly", priority: "0.8" },
  { path: "/magazines", changefreq: "weekly", priority: "0.6" },
  { path: "/playlists", changefreq: "weekly", priority: "0.6" },
  { path: "/artistes", changefreq: "weekly", priority: "0.7" },
  { path: "/clips", changefreq: "weekly", priority: "0.6" },
  { path: "/top", changefreq: "daily", priority: "0.6" },
  { path: "/top-users", changefreq: "daily", priority: "0.5" },
  { path: "/dedicaces", changefreq: "monthly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/newsletter", changefreq: "monthly", priority: "0.4" },
  { path: "/soumission-artistes", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "monthly", priority: "0.5" },
  { path: "/moderation", changefreq: "monthly", priority: "0.5" },
  { path: "/coups-de-coeur", changefreq: "weekly", priority: "0.7" },
];

function normalizeDate(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    return new Date(d).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Métadonnées de fraîcheur.
 *
 * `changefreq` reflète la vitesse réelle de changement d'une page :
 * un contenu publié il y a 3 jours bouge encore (corrections, likes,
 * commentaires), un contenu d'il y a 2 ans ne bouge plus. `priority`
 * part d'une base propre au type de contenu puis décroît avec l'âge,
 * ce qui concentre le budget de crawl sur les publications récentes.
 */
const DAY = 86_400_000;

function ageInDays(lastmod?: string): number | undefined {
  if (!lastmod) return undefined;
  const t = Date.parse(lastmod);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, (Date.now() - t) / DAY);
}

/** changefreq dérivé de l'âge du contenu (pas d'une valeur figée). */
function freqForAge(days: number | undefined, floor: string = "yearly"): string {
  if (days === undefined) return "monthly";
  if (days <= 2) return "hourly";
  if (days <= 7) return "daily";
  if (days <= 45) return "weekly";
  if (days <= 365) return "monthly";
  return floor;
}

/** Priorité = base du type de page, atténuée par l'ancienneté. */
function priorityForAge(base: number, days: number | undefined): string {
  let p = base;
  if (days !== undefined) {
    if (days <= 7) p += 0.1;
    else if (days <= 30) p += 0.05;
    else if (days > 365) p -= 0.2;
    else if (days > 180) p -= 0.1;
  }
  return Math.min(0.9, Math.max(0.1, Math.round(p * 100) / 100)).toFixed(1);
}

/** Métadonnées combinées pour une entrée de contenu daté. */
function contentMeta(
  base: number,
  lastmod: string | undefined,
  floor?: string,
): Pick<SitemapEntry, "changefreq" | "priority" | "lastmod"> {
  const days = ageInDays(lastmod);
  return { changefreq: freqForAge(days, floor), priority: priorityForAge(base, days), lastmod };
}

export async function loadAllEntries(): Promise<SitemapEntry[]> {
  const entries = [...STATIC_ENTRIES];
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    // Chroniques (album reviews, published)
    const { data: reviews } = await sb
      .from("album_reviews")
      .select("slug, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false });
    for (const r of reviews ?? []) {
      entries.push({
        path: `/chroniques/${r.slug}`,
        ...contentMeta(0.7, normalizeDate(r.updated_at)),
      });
    }
    // News posts (Indi Rézo)
    const { data: news } = await sb
      .from("news_posts")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of news ?? []) {
      entries.push({
        path: `/actus/${r.id}`,
        ...contentMeta(0.65, normalizeDate(r.updated_at)),
      });
    }
    // Shows (emissions, podcasts, chroniques hosts, animateurs)
    const { data: shows } = await sb
      .from("shows")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of shows ?? []) {
      entries.push({
        path: `/emissions/${r.id}`,
        // Une émission reçoit de nouveaux épisodes : plancher "monthly".
        ...contentMeta(0.7, normalizeDate(r.updated_at), "monthly"),
      });
    }
    // Episodes
    const { data: episodes } = await sb
      .from("episodes")
      .select("id, published_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5000);
    for (const r of episodes ?? []) {
      entries.push({
        path: `/episodes/${r.id}`,
        ...contentMeta(0.6, normalizeDate((r as any).updated_at ?? r.published_at)),
      });
    }
    // Magazines
    const { data: mags } = await sb
      .from("magazine_entries")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    for (const r of mags ?? []) {
      entries.push({
        path: `/magazines/${r.id}`,
        ...contentMeta(0.55, normalizeDate(r.created_at)),
      });
    }
    // Clips
    const { data: clips } = await sb
      .from("clip_entries")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    for (const r of clips ?? []) {
      entries.push({
        path: `/clips/${r.id}`,
        ...contentMeta(0.55, normalizeDate(r.created_at)),
      });
    }
    // Social wall posts (publications)
    // Playlists (publiées)
    const { data: playlists } = await sb
      .from("playlist_entries")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(500);
    for (const r of playlists ?? []) {
      if (!r.slug) continue;
      entries.push({
        path: `/playlists/${r.slug}`,
        // Une playlist est régulièrement retouchée : plancher "monthly".
        ...contentMeta(0.6, normalizeDate(r.updated_at), "monthly"),
      });
    }
    const { data: posts } = await sb
      .from("posts")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of posts ?? []) {
      entries.push({
        path: `/p/${r.id}`,
        ...contentMeta(0.45, normalizeDate(r.updated_at)),
      });
    }
    // Public user profiles are served by /sitemap-users.xml so canonical
    // /u/$pseudo URLs live in a single dedicated sitemap (no alias, no
    // duplicate). Do not add them here.
    // Public photo albums
    const { data: albums } = await sb
      .from("photo_albums")
      .select("id, owner_id, profiles!inner(pseudo), updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of albums ?? []) {
      const owner = (r as any).profiles?.pseudo;
      if (!owner) continue;
      entries.push({
        path: `/u/${encodeURIComponent(owner)}/albums/${r.id}`,
        ...contentMeta(0.4, normalizeDate(r.updated_at)),
      });
    }
  } catch {
    /* fail-soft */
  }
  return await filterNoindex(entries);
}

/** Remove paths the admin marked as "non indexé" in the SEO panel. */
async function filterNoindex(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb.from("seo_overrides").select("path").eq("noindex", true);
    if (!data?.length) return entries;
    const blocked = new Set(
      data.map((r) => (r.path.replace(/\/+$/, "") || "/")),
    );
    return entries.filter((e) => !blocked.has(e.path.replace(/\/+$/, "") || "/"));
  } catch {
    return entries;
  }
}

/**
 * Compute the freshest lastmod across all entries. Used to emit
 * `Last-Modified` and a weak ETag so CDNs / crawlers can revalidate
 * cheaply and pick up new publications quickly.
 */
export function computeMaxLastmod(entries: SitemapEntry[]): string {
  let maxTs = 0;
  for (const e of entries) {
    if (!e.lastmod) continue;
    const t = Date.parse(e.lastmod);
    if (!Number.isNaN(t) && t > maxTs) maxTs = t;
  }
  return new Date(maxTs || Date.now()).toUTCString();
}

/**
 * Build cache headers with SWR + conditional-GET support. Short TTL so
 * new content shows up in the sitemap within minutes, SWR keeps latency
 * low, and ETag/Last-Modified let crawlers hit 304 the rest of the time.
 */
export function sitemapHeaders(body: string, lastModified: string): Headers {
  const h = new Headers();
  h.set("Content-Type", "application/xml");
  // Revalidation quasi immédiate : un slug modifié doit apparaître tout de
  // suite dans le sitemap (le CDN sert la version en cache pendant ce temps).
  h.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600, must-revalidate");
  h.set("Last-Modified", lastModified);
  // Weak ETag from body length + lastmod (cheap, stable)
  h.set("ETag", `W/"${body.length.toString(16)}-${Date.parse(lastModified).toString(16)}"`);
  return h;
}

export function matchesConditional(request: Request, lastModified: string, etag: string): boolean {
  const inm = request.headers.get("if-none-match");
  if (inm && inm === etag) return true;
  const ims = request.headers.get("if-modified-since");
  if (ims) {
    const since = Date.parse(ims);
    const mod = Date.parse(lastModified);
    if (!Number.isNaN(since) && !Number.isNaN(mod) && mod <= since) return true;
  }
  return false;
}

import { SITE_ORIGIN, canonicalUrl } from "@/lib/canonical";

export const BASE_URL = SITE_ORIGIN;

/**
 * Build a language-scoped sitemap that cross-references its counterpart via
 * `<xhtml:link rel="alternate" hreflang="...">`, per Google's guidance.
 * https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap
 */
export function renderLocalizedSitemap(entries: SitemapEntry[], lang: "fr" | "en"): string {
  const other: "fr" | "en" = lang === "fr" ? "en" : "fr";
  const urls = entries
    .map((e) => {
      // Même règle que les balises <link rel="canonical"> du site :
      // le français est l'URL nue, l'anglais porte ?hl=en.
      const self = canonicalUrl(e.path, { lang });
      const frUrl = canonicalUrl(e.path, { lang: "fr" });
      const enUrl = canonicalUrl(e.path, { lang: "en" });
      const xDefault = canonicalUrl(e.path);
      void other;
      return [
        `  <url>`,
        `    <loc>${self}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        `    <xhtml:link rel="alternate" hreflang="fr-FR" href="${frUrl}"/>`,
        `    <xhtml:link rel="alternate" hreflang="fr" href="${frUrl}"/>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefault}"/>`,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}

/**
 * Index de sitemaps. `lastmod` (ISO) est propagé aux sitemaps dont le
 * contenu dépend des publications, pour que Google/Bing sachent lequel
 * recrawler en priorité.
 */
export function renderSitemapIndex(lastmod?: string): string {
  const child = (name: string, withLastmod = true) =>
    `  <sitemap><loc>${BASE_URL}/${name}</loc>${
      lastmod && withLastmod ? `<lastmod>${lastmod}</lastmod>` : ""
    }</sitemap>`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    child("sitemap-fr.xml"),
    child("sitemap-en.xml"),
    child("sitemap-users.xml"),
    child("sitemap-images.xml"),
    child("sitemap-video.xml"),
    `</sitemapindex>`,
  ].join("\n");
}
