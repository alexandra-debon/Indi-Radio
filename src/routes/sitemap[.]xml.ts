import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  renderSitemapIndex,
  loadAllEntries,
  computeMaxLastmod,
  sitemapHeaders,
  matchesConditional,
} from "@/lib/sitemap-entries";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Sitemap index — points to per-language sitemaps that carry
        // <xhtml:link rel="alternate" hreflang="..."> entries.
        const entries = await loadAllEntries();
        const lastModified = computeMaxLastmod(entries);
        const body = renderSitemapIndex(new Date(lastModified).toISOString());
        const headers = sitemapHeaders(body, lastModified);
        if (matchesConditional(request, lastModified, headers.get("ETag")!)) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(body, { headers });
      },
    },
  },
});