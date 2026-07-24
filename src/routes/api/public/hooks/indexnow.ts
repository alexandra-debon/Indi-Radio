import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Canonical public host used across the app (see robots.txt / sitemaps).
const CANONICAL_HOST = "radio.indi-art-culture.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

// Accept a small batch of pseudos + optional extra URLs. The DB trigger
// posts { pseudos: [old, new] } on every pseudo change; the sitemap and
// both profile URLs are always resubmitted so search engines re-crawl
// the canonical target and drop the alias quickly.
const BodySchema = z.object({
  pseudos: z.array(z.string().min(1).max(64)).max(20).optional(),
  extraUrls: z.array(z.string().url()).max(20).optional(),
});

function buildUrlList(pseudos: string[], extras: string[]): string[] {
  const urls = new Set<string>();
  urls.add(`${CANONICAL_ORIGIN}/sitemap-users.xml`);
  for (const p of pseudos) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    urls.add(`${CANONICAL_ORIGIN}/u/${encodeURIComponent(trimmed)}`);
  }
  for (const u of extras) {
    try {
      const parsed = new URL(u);
      if (parsed.host === CANONICAL_HOST) urls.add(parsed.toString());
    } catch {
      /* ignore */
    }
  }
  return Array.from(urls);
}

export const Route = createFileRoute("/api/public/hooks/indexnow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.INDEXNOW_KEY;
        if (!key) {
          return Response.json(
            { ok: false, error: "INDEXNOW_KEY not configured" },
            { status: 503 },
          );
        }

        let payload: unknown = {};
        try {
          payload = await request.json();
        } catch {
          payload = {};
        }
        const parsed = BodySchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const urlList = buildUrlList(
          parsed.data.pseudos ?? [],
          parsed.data.extraUrls ?? [],
        );

        const body = {
          host: CANONICAL_HOST,
          key,
          keyLocation: `${CANONICAL_ORIGIN}/api/public/indexnow-key.txt`,
          urlList,
        };

        try {
          const res = await fetch(INDEXNOW_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify(body),
          });
          const text = await res.text();
          if (!res.ok) {
            console.error(`IndexNow ping failed [${res.status}]: ${text}`);
            return Response.json(
              { ok: false, status: res.status, body: text, submitted: urlList },
              { status: 502 },
            );
          }
          return Response.json({ ok: true, status: res.status, submitted: urlList });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`IndexNow ping error: ${msg}`);
          return Response.json(
            { ok: false, error: msg, submitted: urlList },
            { status: 502 },
          );
        }
      },
    },
  },
});