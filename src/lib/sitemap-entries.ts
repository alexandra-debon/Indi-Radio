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
    const { data } = await sb
      .from("album_reviews")
      .select("slug, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false });
    for (const r of data ?? []) {
      entries.push({ path: `/chroniques/${r.slug}`, changefreq: "monthly", priority: "0.6" });
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