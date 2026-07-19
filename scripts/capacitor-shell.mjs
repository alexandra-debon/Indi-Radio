#!/usr/bin/env node
/**
 * Generates a minimal `dist/client/index.html` after `vite build`.
 *
 * Why: this project runs on TanStack Start + Nitro (SSR on Cloudflare
 * Workers). The build emits `dist/client/` (static assets: icons, splash,
 * manifest, JS chunks) and `dist/server/` (SSR worker). There is NO
 * standalone SPA `index.html` — every HTML response is rendered by the
 * worker at request time.
 *
 * Capacitor (`cap sync`) requires `webDir` to exist AND contain an
 * `index.html`, otherwise it errors:
 *   "Could not find the web assets directory: ./dist"
 *
 * We therefore emit a tiny shell `index.html` whose only job is to bootstrap
 * the native shell — the actual UI is loaded from `server.url`
 * (https://radio.indi-art-culture.com) configured in `capacitor.config.ts`.
 * If the device is offline at cold-start, this shell also shows a minimal
 * branded fallback instead of a blank white screen.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "dist", "client");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const LIVE_URL = "https://radio.indi-art-culture.com/";

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>InDi RaDio</title>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icons/icon-192.png" />
    <meta http-equiv="refresh" content="0; url=${LIVE_URL}" />
    <style>
      html,body{margin:0;height:100%;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;}
      .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;text-align:center;padding:24px;}
      .brand{font-weight:900;letter-spacing:.02em;font-size:28px;color:#facc15;}
      .hint{opacity:.75;font-size:14px;max-width:280px;line-height:1.4;}
      a{color:#facc15;}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="brand">InDi RaDio</div>
      <div class="hint">Chargement…<br/>Si rien ne s'affiche, ouvrez <a href="${LIVE_URL}">${LIVE_URL}</a>.</div>
    </div>
    <script>window.location.replace(${JSON.stringify(LIVE_URL)});</script>
  </body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log("[capacitor-shell] wrote dist/client/index.html →", LIVE_URL);