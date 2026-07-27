#!/usr/bin/env node
// Checks each static public route so that <meta name="description">
// and <meta property="og:description"> both contain the exact phrase
// "24/7 de la musique indépendante" (FR) or "24/7 independent music" (EN).
//
// Usage:
//   node scripts/check-seo-tagline.mjs              # localhost:8080
//   BASE_URL=https://radio.indi-art-culture.com node scripts/check-seo-tagline.mjs

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const FR_TAGLINE = "24/7 de la musique indépendante";
const EN_TAGLINE = "24/7 independent music";

const ROUTES = [
  "/", "/actus", "/emissions", "/chart", "/podcasts", "/chroniques",
  "/magazines", "/artistes", "/clips", "/top", "/top-users", "/dedicaces",
  "/about", "/newsletter", "/soumission-artistes", "/contact",
  "/privacy", "/terms", "/moderation", "/coups-de-coeur",
];

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractMeta(html) {
  const description = pick(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogDescription = pick(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );
  return { description, ogDescription };
}

async function checkRoute(path, lang) {
  const url = `${BASE_URL}${path}`;
  const tagline = lang === "en" ? EN_TAGLINE : FR_TAGLINE;
  const headers = lang === "en" ? { "Accept-Language": "en" } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    return { path, lang, ok: false, reason: `HTTP ${res.status}` };
  }
  const html = await res.text();
  const { description, ogDescription } = extractMeta(html);
  const problems = [];
  if (!description) problems.push("meta description missing");
  else if (!description.includes(tagline))
    problems.push(`description missing "${tagline}" (got: "${description}")`);
  if (!ogDescription) problems.push("og:description missing");
  else if (!ogDescription.includes(tagline))
    problems.push(`og:description missing "${tagline}" (got: "${ogDescription}")`);
  return { path, lang, ok: problems.length === 0, reason: problems.join(" | ") };
}

async function main() {
  const langs = (process.env.LANGS || "fr").split(",");
  const results = [];
  for (const lang of langs) {
    for (const path of ROUTES) {
      results.push(await checkRoute(path, lang.trim()));
    }
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} [${r.lang}] ${r.path}${r.ok ? "" : `  — ${r.reason}`}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} routes OK`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});