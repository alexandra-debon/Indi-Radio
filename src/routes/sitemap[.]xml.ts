import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://radio.indi-art-culture.com";

interface SitemapEntry { path: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/actus", changefreq: "daily", priority: "0.9" },
          { path: "/emissions", changefreq: "weekly", priority: "0.8" },
          { path: "/chart", changefreq: "daily", priority: "0.7" },
          { path: "/podcasts", changefreq: "weekly", priority: "0.7" },
          { path: "/chroniques", changefreq: "weekly", priority: "0.8" },
          { path: "/dedicaces", changefreq: "monthly", priority: "0.5" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/newsletter", changefreq: "monthly", priority: "0.4" },
          { path: "/soumission-artistes", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "monthly", priority: "0.5" },
          { path: "/terms", changefreq: "monthly", priority: "0.5" },
        ];
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
        } catch { /* fail-soft: static entries still served */ }
        const urls = entries.map((e) => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});