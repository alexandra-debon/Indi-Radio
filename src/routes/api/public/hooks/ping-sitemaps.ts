import { createFileRoute } from "@tanstack/react-router";

// Soumission automatique des sitemaps (index + par langue) à IndexNow
// (Bing, Yandex, Seznam, Naver…). Appelé quotidiennement par pg_cron et
// manuellement depuis le panneau SEO. Google n'accepte plus de ping :
// il recrawle via le <lastmod> de l'index déclaré dans robots.txt.
const CANONICAL_HOST = "radio.indi-art-culture.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

const SITEMAPS = [
  "/sitemap.xml",
  "/sitemap-fr.xml",
  "/sitemap-en.xml",
  "/sitemap-users.xml",
  "/sitemap-images.xml",
  "/sitemap-video.xml",
];

async function ping() {
  const key = process.env["INDEXNOW_KEY"];
  if (!key) {
    return Response.json({ ok: false, error: "INDEXNOW_KEY not configured" }, { status: 503 });
  }
  const urlList = SITEMAPS.map((p) => `${CANONICAL_ORIGIN}${p}`);
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: CANONICAL_HOST,
        key,
        keyLocation: `${CANONICAL_ORIGIN}/api/public/indexnow-key.txt`,
        urlList,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`IndexNow sitemap ping failed [${res.status}]: ${text}`);
      return Response.json({ ok: false, status: res.status, body: text, submitted: urlList }, { status: 502 });
    }
    return Response.json({ ok: true, status: res.status, submitted: urlList });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`IndexNow sitemap ping error: ${msg}`);
    return Response.json({ ok: false, error: msg, submitted: urlList }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/public/hooks/ping-sitemaps")({
  server: {
    handlers: {
      GET: async () => ping(),
      POST: async () => ping(),
    },
  },
});
