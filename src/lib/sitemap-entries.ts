import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
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
];

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
      .select("slug")
      .eq("published", true)
      .order("updated_at", { ascending: false });
    for (const r of reviews ?? []) {
      entries.push({ path: `/chroniques/${r.slug}`, changefreq: "monthly", priority: "0.6" });
    }
    // News posts (Indi Rézo)
    const { data: news } = await sb
      .from("news_posts")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(2000);
    for (const r of news ?? []) {
      entries.push({ path: `/actus/${r.id}`, changefreq: "weekly", priority: "0.6" });
    }
    // Shows (emissions, podcasts, chroniques hosts, animateurs)
    const { data: shows } = await sb
      .from("shows")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(2000);
    for (const r of shows ?? []) {
      entries.push({ path: `/emissions/${r.id}`, changefreq: "weekly", priority: "0.6" });
    }
    // Episodes
    const { data: episodes } = await sb
      .from("episodes")
      .select("id")
      .order("published_at", { ascending: false })
      .limit(5000);
    for (const r of episodes ?? []) {
      entries.push({ path: `/episodes/${r.id}`, changefreq: "monthly", priority: "0.5" });
    }
    // Magazines
    const { data: mags } = await sb
      .from("magazine_entries")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1000);
    for (const r of mags ?? []) {
      entries.push({ path: `/magazines/${r.id}`, changefreq: "monthly", priority: "0.5" });
    }
    // Clips
    const { data: clips } = await sb
      .from("clip_entries")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(2000);
    for (const r of clips ?? []) {
      entries.push({ path: `/clips/${r.id}`, changefreq: "monthly", priority: "0.5" });
    }
  } catch {
    /* fail-soft */
  }
  return entries;
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
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        `    <xhtml:link rel="alternate" hreflang="${lang}" href="${self}"/>`,
        `    <xhtml:link rel="alternate" hreflang="${other}" href="${alt}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefault}"/>`,
        `  </url>`,
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}

export function renderSitemapIndex(): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${BASE_URL}/sitemap-fr.xml</loc><lastmod>${now}</lastmod></sitemap>\n  <sitemap><loc>${BASE_URL}/sitemap-en.xml</loc><lastmod>${now}</lastmod></sitemap>\n</sitemapindex>`;
}