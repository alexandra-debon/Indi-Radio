import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { loadAllEntries, renderLocalizedSitemap } from "@/lib/sitemap-entries";

export const Route = createFileRoute("/sitemap-fr.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = await loadAllEntries();
        return new Response(renderLocalizedSitemap(entries, "fr"), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});