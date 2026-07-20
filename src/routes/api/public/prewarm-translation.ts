import { createFileRoute } from "@tanstack/react-router";

type Item = { entityType: string; entityKey: string; field: string; text: string };

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export const Route = createFileRoute("/api/public/prewarm-translation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { items?: Item[] } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length === 0) return new Response("ok");

        const clean = items
          .filter(
            (i) =>
              i &&
              isNonEmpty(i.entityType) &&
              isNonEmpty(i.entityKey) &&
              isNonEmpty(i.field) &&
              isNonEmpty(i.text) &&
              i.text.length <= 20000,
          )
          .slice(0, 8);

        if (clean.length === 0) return new Response("ok");

        const { ensureTranslation } = await import("@/lib/translate.server");
        // Fire in parallel; both target langs so cache is warm regardless of viewer.
        await Promise.allSettled(
          clean.flatMap((it) => [
            ensureTranslation(it, "en"),
            ensureTranslation(it, "fr"),
          ]),
        );
        return new Response("ok");
      },
    },
  },
});