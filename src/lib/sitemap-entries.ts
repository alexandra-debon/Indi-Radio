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
        changefreq: "monthly",
        priority: "0.6",
        lastmod: normalizeDate(r.updated_at),
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
        changefreq: "weekly",
        priority: "0.6",
        lastmod: normalizeDate(r.updated_at),
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
        changefreq: "weekly",
        priority: "0.6",
        lastmod: normalizeDate(r.updated_at),
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
        changefreq: "monthly",
        priority: "0.5",
        lastmod: normalizeDate((r as any).updated_at ?? r.published_at),
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
        changefreq: "monthly",
        priority: "0.5",
        lastmod: normalizeDate(r.created_at),
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
        changefreq: "monthly",
        priority: "0.5",
        lastmod: normalizeDate(r.created_at),
      });
    }
    // Social wall posts (publications)
    const { data: posts } = await sb
      .from("posts")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of posts ?? []) {
      entries.push({
        path: `/p/${r.id}`,
        changefreq: "monthly",
        priority: "0.5",
        lastmod: normalizeDate(r.updated_at),
      });
    }
    // Public user profiles
    const { data: profiles } = await sb
      .from("profiles")
      .select("pseudo, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of profiles ?? []) {
      if (!r.pseudo) continue;
      entries.push({
        path: `/u/${encodeURIComponent(r.pseudo)}`,
        changefreq: "monthly",
        priority: "0.4",
        lastmod: normalizeDate(r.updated_at),
      });
    }
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
        changefreq: "monthly",
        priority: "0.4",
        lastmod: normalizeDate(r.updated_at),
      });
    }
  } catch {
    /* fail-soft */
  }
  return entries;
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
  h.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=86400");
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

export const BASE_URL = "https://radio.indi-art-culture.com";

/**
 * Build a language-scoped sitemap that cross-references its counterpart via
 * `<xhtml:link rel="alternate" hreflang="...">`, per Google's guidance.
 * https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap
 */
export function renderLocalizedSitemap(entries: SitemapEntry[], lang: "fr" | "en"): string {
  const other: "fr" | "en" = lang === "fr" ? "en" : "fr";
  const urls = entries
    .map((e) => {
      const self = `${BASE_URL}${e.path}?hl=${lang}`;
      const alt = `${BASE_URL}${e.path}?hl=${other}`;
      const xDefault = `${BASE_URL}${e.path}`;
      return [
        `  <url>`,
        `    <loc>${self}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        `    <xhtml:link rel="alternate" hreflang="${lang}" href="${self}"/>`,
        `    <xhtml:link rel="alternate" hreflang="${other}" href="${alt}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefault}"/>`,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}

export function renderSitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${BASE_URL}/sitemap-fr.xml</loc></sitemap>\n  <sitemap><loc>${BASE_URL}/sitemap-en.xml</loc></sitemap>\n  <sitemap><loc>${BASE_URL}/sitemap-images.xml</loc></sitemap>\n</sitemapindex>`;
}
