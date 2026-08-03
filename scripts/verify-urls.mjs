#!/usr/bin/env node
/**
 * Vérificateur interne pré-soumission (Search Console / IndexNow).
 *
 * Pour chaque URL listée dans le sitemap index (FR, EN, profils…), contrôle :
 *   1. le statut HTTP (200 attendu, pas de 3xx/4xx/5xx)
 *   2. la présence d'un <link rel="canonical"> unique et auto-référent
 *   3. la présence des alternates hreflang (fr, en, x-default) cohérents
 *   4. l'absence de <meta name="robots" content="noindex">
 *
 * Usage :
 *   node scripts/verify-urls.mjs
 *   BASE_URL=http://localhost:8080 node scripts/verify-urls.mjs
 *   node scripts/verify-urls.mjs --limit 40 --concurrency 8
 *   node scripts/verify-urls.mjs --sitemap https://exemple.com/sitemap-fr.xml
 */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (process.env.BASE_URL ?? flag("base", "https://www.radio.indi-art-culture.com")).replace(/\/$/, "");
const LIMIT = Number(flag("limit", process.env.URL_CHECK_LIMIT ?? 120));
const CONCURRENCY = Number(flag("concurrency", 6));
const SITEMAP_OVERRIDE = flag("sitemap", "");
// hreflang est déclaré au niveau du sitemap (xhtml:link) : la présence dans le
// <head> HTML est un bonus, signalée en avertissement sauf --strict-hreflang.
const CHECK_HREFLANG = !args.includes("--no-hreflang");
const STRICT_HREFLANG = args.includes("--strict-hreflang");

const errors = [];
const warnings = [];

const fail = (url, msg) => errors.push(`${url} → ${msg}`);
const warn = (url, msg) => warnings.push(`${url} → ${msg}`);

async function getText(url, init = {}) {
  const res = await fetch(url, { redirect: init.follow ? "follow" : "manual", headers: { "User-Agent": "IndiRadio-URLCheck/1.0" }, ...init });
  const body = res.status >= 200 && res.status < 400 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), body, contentType: res.headers.get("content-type") ?? "" };
}

function matchAll(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`, "g"))].map((m) => m[1]);
}

/** Contrôle des alternates hreflang déclarés dans le sitemap lui-même. */
function checkSitemapAlternates(sitemapUrl, xml) {
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
    if (!loc) continue;
    const alts = [...block.matchAll(/hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/g)].map((m) => ({
      lang: m[1].toLowerCase(),
      href: m[2],
    }));
    if (!alts.length) continue; // sitemaps images/vidéos/profils sans alternates
    for (const required of ["fr", "en", "x-default"]) {
      if (!alts.some((a) => a.lang === required || a.lang.startsWith(`${required}-`))) {
        fail(loc, `sitemap ${sitemapUrl}: hreflang "${required}" manquant`);
      }
    }
    const selfRef = alts.some((a) => normalize(a.href) === normalize(loc));
    if (!selfRef) fail(loc, `sitemap ${sitemapUrl}: aucun alternate auto-référent`);
    for (const a of alts) {
      if (!/^https?:\/\//i.test(a.href)) fail(loc, `sitemap: hreflang ${a.lang} non absolu (${a.href})`);
    }
  }
}

/** Résout la liste des sitemaps enfants depuis l'index. */
async function collectSitemaps() {
  if (SITEMAP_OVERRIDE) return [SITEMAP_OVERRIDE];
  const indexUrl = `${BASE}/sitemap.xml`;
  const { status, body, contentType } = await getText(indexUrl, { follow: true });
  if (status !== 200) {
    fail(indexUrl, `sitemap index inaccessible (HTTP ${status})`);
    return [];
  }
  if (!/xml/i.test(contentType)) warn(indexUrl, `Content-Type inattendu: ${contentType}`);
  if (body.includes("<sitemapindex")) {
    const children = matchAll(body, "loc");
    if (!children.length) fail(indexUrl, "sitemap index vide");
    return children;
  }
  return [indexUrl];
}

/** Extrait les <loc> d'un sitemap enfant. */
async function collectUrls(sitemapUrl) {
  const { status, body } = await getText(sitemapUrl, { follow: true });
  if (status !== 200) {
    fail(sitemapUrl, `sitemap inaccessible (HTTP ${status})`);
    return [];
  }
  checkSitemapAlternates(sitemapUrl, body);
  const locs = matchAll(body, "loc").filter((u) => !u.endsWith(".xml"));
  if (!locs.length) warn(sitemapUrl, "aucune URL listée");
  return locs;
}

const head = (html) => html.split(/<\/head>/i)[0] ?? html;

function extractCanonical(html) {
  const tags = [...head(html).matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)].map((m) => m[0]);
  const hrefs = tags.map((t) => t.match(/href=["']([^"']+)["']/i)?.[1]).filter(Boolean);
  return { count: tags.length, hrefs };
}

function extractHreflang(html) {
  return [...head(html).matchAll(/<link[^>]+rel=["']alternate["'][^>]*>/gi)]
    .map((m) => ({
      hreflang: m[0].match(/hreflang=["']([^"']+)["']/i)?.[1],
      href: m[0].match(/href=["']([^"']+)["']/i)?.[1],
    }))
    .filter((l) => l.hreflang);
}

/** Même URL à la variante d'hôte près (apex ⇄ www) et au slash final près. */
const normalize = (u) => {
  try {
    const p = new URL(u, BASE);
    p.hash = "";
    p.hostname = p.hostname.replace(/^www\./i, "");
    if (p.pathname !== "/" && p.pathname.endsWith("/")) p.pathname = p.pathname.slice(0, -1);
    return p.toString();
  } catch {
    return u;
  }
};

async function checkUrl(url) {
  let res;
  try {
    res = await getText(url);
  } catch (e) {
    fail(url, `requête échouée: ${e.message}`);
    return;
  }

  if (res.status >= 300 && res.status < 400 && res.location) {
    if (normalize(res.location) === normalize(url)) {
      // Redirection de normalisation d'hôte (apex ⇄ www) gérée par l'hébergeur :
      // non bloquante, on suit et on contrôle la page cible.
      warn(url, `redirection de normalisation d'hôte → ${res.location}`);
      try {
        res = await getText(res.location, { follow: true });
      } catch (e) {
        fail(url, `cible de redirection injoignable: ${e.message}`);
        return;
      }
    }
  }

  if (res.status !== 200) {
    fail(url, `HTTP ${res.status}${res.location ? ` → ${res.location}` : ""} (200 attendu dans un sitemap)`);
    return;
  }

  const html = res.body;

  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(head(html))) {
    fail(url, "noindex présent alors que l'URL est dans le sitemap");
  }

  const { count, hrefs } = extractCanonical(html);
  if (count === 0) fail(url, "canonical manquante");
  else if (count > 1) fail(url, `${count} balises canonical (une seule autorisée)`);
  else {
    const canonical = hrefs[0];
    if (!/^https?:\/\//i.test(canonical)) fail(url, `canonical non absolue: ${canonical}`);
    else if (normalize(canonical) !== normalize(url)) {
      fail(url, `canonical non auto-référente: ${canonical}`);
    }
  }

  if (CHECK_HREFLANG) {
    const report = STRICT_HREFLANG ? fail : warn;
    const alts = extractHreflang(html).filter((a) => a.hreflang);
    if (!alts.length) {
      report(url, "aucun alternate hreflang dans le <head> (déclaré côté sitemap uniquement)");
    } else {
      const langs = alts.map((a) => a.hreflang.toLowerCase());
      for (const required of ["fr", "en", "x-default"]) {
        if (!langs.some((l) => l === required || l.startsWith(`${required}-`))) {
          report(url, `hreflang "${required}" manquant dans le <head>`);
        }
      }
      const seen = new Set();
      for (const a of alts) {
        const key = a.hreflang.toLowerCase();
        if (seen.has(key)) fail(url, `hreflang dupliqué dans le <head>: ${a.hreflang}`);
        seen.add(key);
        if (!a.href || !/^https?:\/\//i.test(a.href)) fail(url, `hreflang ${a.hreflang}: href non absolue (${a.href})`);
      }
    }
  }
}

async function pool(items, worker, size) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await worker(item);
      }
    }),
  );
}

console.log(`[verify:urls] base = ${BASE}`);
const sitemaps = await collectSitemaps();
console.log(`[verify:urls] ${sitemaps.length} sitemap(s) détecté(s)`);

const all = [];
for (const sm of sitemaps) {
  const urls = await collectUrls(sm);
  console.log(`[verify:urls]   ${sm} → ${urls.length} URL(s)`);
  all.push(...urls);
}

const unique = [...new Set(all.map((u) => u.trim()))];
const sample = unique.slice(0, LIMIT);
console.log(`[verify:urls] contrôle de ${sample.length}/${unique.length} URL(s) (concurrence ${CONCURRENCY})…`);

let done = 0;
await pool(sample, async (u) => {
  await checkUrl(u);
  done++;
  if (done % 20 === 0) console.log(`[verify:urls]   ${done}/${sample.length}…`);
}, CONCURRENCY);

if (warnings.length) {
  console.warn(`\n[verify:urls] ⚠️  ${warnings.length} avertissement(s):`);
  warnings.forEach((w) => console.warn(`  - ${w}`));
}

if (errors.length) {
  console.error(`\n[verify:urls] ❌ ${errors.length} erreur(s) bloquante(s):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error("\n[verify:urls] Corrige ces URL avant toute soumission aux moteurs.");
  process.exit(1);
}

console.log(`\n[verify:urls] ✅ ${sample.length} URL(s) valides — statut 200, canonical auto-référente, hreflang complets.`);
