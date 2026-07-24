import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  BASE_URL,
  computeMaxLastmod,
  sitemapHeaders,
  matchesConditional,
  type SitemapEntry,
} from "@/lib/sitemap-entries";

const MAX_PROFILES = 5000;

export const Route = createFileRoute("/sitemap-users.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const entries: SitemapEntry[] = [];
        try {
          const sb = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          // Canonical profile URLs only — exclude quarantined/banned
          // and rely on `profiles.pseudo` which is always the current
          // handle. Historical pseudos live in `pseudo_history` and
          // 301-redirect from `/u/$pseudo`, so they must NOT appear here.
          const { data: profiles } = await sb
            .from("profiles")
            .select("pseudo, updated_at, quarantined_at")
            .is("quarantined_at", null)
            .order("updated_at", { ascending: false })
            .limit(MAX_PROFILES);
          for (const r of profiles ?? []) {
            if (!r.pseudo) continue;
            entries.push({
              path: `/u/${encodeURIComponent(r.pseudo)}`,
              changefreq: "weekly",
              priority: "0.5",
              lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
            });
          }
        } catch {
          /* fail-soft */
        }

        const urls = entries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              `    <changefreq>${e.changefreq}</changefreq>`,
              `    <priority>${e.priority}</priority>`,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        const lastModified = computeMaxLastmod(entries);
        const headers = sitemapHeaders(body, lastModified);
        if (matchesConditional(request, lastModified, headers.get("ETag")!)) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(body, { headers });
      },
    },
  },
});