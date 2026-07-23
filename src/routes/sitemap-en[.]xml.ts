import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  loadAllEntries,
  renderLocalizedSitemap,
  computeMaxLastmod,
  sitemapHeaders,
  matchesConditional,
} from "@/lib/sitemap-entries";

export const Route = createFileRoute("/sitemap-en.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const entries = await loadAllEntries();
        const body = renderLocalizedSitemap(entries, "en");
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