#!/usr/bin/env node
/**
 * SEO sync verification.
 *
 * For every listed route, in both fr and en, this script loads the page and
 * checks that the visible content (title/h1) stays in sync with the SEO tags:
 *   - <title> vs og:title vs twitter:title
 *   - meta[name=description] vs og:description vs twitter:description
 *   - link[rel=canonical] vs og:url
 *   - link[rel=alternate][hreflang=fr|en|x-default]
 *   - meta[property=og:type|og:locale|og:site_name]
 *   - meta[name=twitter:card]
 *   - <h1> presence, and its text should overlap the <title>
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node scripts/verify-seo-sync.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";

const ROUTES = [
  "/", "/about", "/actus", "/podcasts", "/emissions", "/chroniques",
  "/magazines", "/clips", "/chart", "/top", "/top-users", "/dedicaces",
  "/contact", "/soumission-artistes", "/newsletter", "/privacy", "/terms",
  "/auth", "/reset-password",
];

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s) {
  return new Set(normalize(s).split(" ").filter((w) => w.length >= 4));
}

function overlapScore(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size);
}

function collect() {
  const $ = (sel) => document.head.querySelector(sel);
  const $$ = (sel) => [...document.head.querySelectorAll(sel)];
  const metaC = (sel) => $(sel)?.getAttribute("content") ?? "";
  return {
    title: document.title,
    description: metaC('meta[name="description"]'),
    canonical: $('link[rel="canonical"]')?.getAttribute("href") ?? "",
    hreflangs: $$('link[rel="alternate"][hreflang]').map((l) => ({
      hreflang: l.getAttribute("hreflang"),
      href: l.getAttribute("href"),
    })),
    ogTitle: metaC('meta[property="og:title"]'),
    ogDescription: metaC('meta[property="og:description"]'),
    ogUrl: metaC('meta[property="og:url"]'),
    ogType: metaC('meta[property="og:type"]'),
    ogLocale: metaC('meta[property="og:locale"]'),
    ogSiteName: metaC('meta[property="og:site_name"]'),
    ogImage: metaC('meta[property="og:image"]'),
    twCard: metaC('meta[name="twitter:card"]'),
    twTitle: metaC('meta[name="twitter:title"]'),
    twDescription: metaC('meta[name="twitter:description"]'),
    twImage: metaC('meta[name="twitter:image"]'),
    h1: document.querySelector("h1")?.textContent?.trim() ?? "",
  };
}

function validate(path, lang, snap) {
  const errs = [];
  const warn = [];

  // Presence + length
  if (!snap.title) errs.push("missing <title>");
  else if (snap.title.length > 65) warn.push(`title too long (${snap.title.length})`);
  if (!snap.description) errs.push("missing meta[description]");
  else if (snap.description.length > 170) warn.push(`description too long (${snap.description.length})`);

  // og fallbacks: og:title/description default to <title>/description via renderer
  const ogT = snap.ogTitle || snap.title;
  const ogD = snap.ogDescription || snap.description;
  if (ogT !== snap.title) errs.push(`og:title desync (title="${snap.title}" vs og:title="${snap.ogTitle}")`);
  if (ogD !== snap.description) errs.push(`og:description desync`);

  // twitter mirrors og; blank means the platform falls back to og — allow blank, but flag mismatch when set
  if (snap.twTitle && snap.twTitle !== ogT) errs.push(`twitter:title desync`);
  if (snap.twDescription && snap.twDescription !== ogD) errs.push(`twitter:description desync`);
  if (!snap.twCard) warn.push("missing twitter:card");

  // canonical vs og:url must be same URL (bar query differences we normalize).
  if (!snap.canonical) errs.push("missing canonical");
  if (!snap.ogUrl) errs.push("missing og:url");
  if (snap.canonical && snap.ogUrl && snap.canonical !== snap.ogUrl) {
    errs.push(`canonical != og:url (${snap.canonical} vs ${snap.ogUrl})`);
  }
  // For EN, canonical must carry hl=en; for FR, no hl parameter.
  if (snap.canonical) {
    if (lang === "en" && !/[?&]hl=en(\b|$)/.test(snap.canonical))
      errs.push(`canonical missing hl=en (${snap.canonical})`);
    if (lang === "fr" && /[?&]hl=/.test(snap.canonical))
      errs.push(`canonical should not carry hl for fr (${snap.canonical})`);
  }

  // hreflang set
  const need = new Set(["fr", "en", "x-default"]);
  const seen = new Map();
  for (const l of snap.hreflangs) {
    if (seen.has(l.hreflang)) errs.push(`duplicate hreflang=${l.hreflang}`);
    seen.set(l.hreflang, l.href);
  }
  for (const k of need) if (!seen.has(k)) errs.push(`missing hreflang=${k}`);

  // og:locale
  const wantLocale = lang === "en" ? "en_US" : "fr_FR";
  if (snap.ogLocale && snap.ogLocale !== wantLocale)
    errs.push(`og:locale=${snap.ogLocale} expected ${wantLocale}`);

  // og:type + site_name presence
  if (!snap.ogType) warn.push("missing og:type");
  if (!snap.ogSiteName) warn.push("missing og:site_name");

  // Visible content sync: <h1> should share vocabulary with <title>.
  if (!snap.h1) {
    warn.push("no <h1> on page");
  } else {
    const score = overlapScore(snap.h1, snap.title);
    if (score < 0.15) {
      errs.push(
        `title/h1 desync (score=${score.toFixed(2)}, h1="${snap.h1.slice(0, 60)}", title="${snap.title.slice(0, 60)}")`,
      );
    }
  }

  // Language sanity: EN title/desc must differ from FR (compared later at run-level too).
  return { errs, warn };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let fail = 0;
let pass = 0;
let warns = 0;

// Per-path store to compare FR vs EN.
const perPath = new Map();

for (const path of ROUTES) {
  for (const lang of ["fr", "en"]) {
    const url = `${BASE}${path}?hl=${lang}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Wait for SeoLocalizer to inject canonical/hreflang.
      await page
        .waitForFunction(
          () => document.head.querySelector('link[rel="canonical"]') !== null,
          null,
          { timeout: 15000 },
        )
        .catch(() => {});
      const snap = await page.evaluate(collect);
      const { errs, warn } = validate(path, lang, snap);

      const entry = perPath.get(path) ?? {};
      entry[lang] = snap;
      perPath.set(path, entry);

      if (errs.length) {
        fail++;
        console.error(`FAIL ${url}`);
        for (const e of errs) console.error(`  - ${e}`);
        for (const w of warn) console.warn(`  ~ ${w}`);
      } else {
        pass++;
        warns += warn.length;
        const w = warn.length ? `  (${warn.length} warn)` : "";
        console.log(`ok   ${url}  [${snap.title.slice(0, 55)}]${w}`);
        for (const wm of warn) console.warn(`  ~ ${wm}`);
      }
    } catch (e) {
      fail++;
      console.error(`FAIL ${url}  ${e?.message ?? e}`);
    }
  }
}

// Cross-language: EN meta must differ from FR meta for the same path.
for (const [path, entry] of perPath) {
  if (!entry.fr || !entry.en) continue;
  if (entry.fr.title && entry.en.title && entry.fr.title === entry.en.title) {
    fail++;
    console.error(`FAIL ${path}  FR and EN share the same <title> "${entry.fr.title}"`);
  }
  if (entry.fr.description && entry.en.description && entry.fr.description === entry.en.description) {
    fail++;
    console.error(`FAIL ${path}  FR and EN share the same description`);
  }
}

await browser.close();

console.log(`\n${pass} passed, ${fail} failed, ${warns} warnings across ${ROUTES.length * 2} route/lang combos.`);
process.exit(fail ? 1 : 0);