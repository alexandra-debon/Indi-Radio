import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderSitemapIndex } from "@/lib/sitemap-entries";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Sitemap index — points to per-language sitemaps that carry
        // <xhtml:link rel="alternate" hreflang="..."> entries.
        return new Response(renderSitemapIndex(), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});