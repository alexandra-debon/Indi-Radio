#!/usr/bin/env node
/**
 * End-to-end verification that every page exposes:
 *   - <link rel="alternate" hreflang="fr" href="...?hl=fr">
 *   - <link rel="alternate" hreflang="en" href="...?hl=en">
 *   - <link rel="alternate" hreflang="x-default" href="...">
 *   - <meta property="og:locale" content="...">
 *   - <meta property="og:locale:alternate" content="...">
 * ...with no duplicates and no malformed values.
 *
 * Usage:
 *   BASE_URL=http://localhost:8080 node scripts/verify-hreflang.mjs
 *   BASE_URL=https://radio.indi-art-culture.com node scripts/verify-hreflang.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080";

const ROUTES = [
  "/",
  "/about",
  "/actus",
  "/podcasts",
  "/emissions",
  "/chroniques",
  "/magazines",
  "/clips",
  "/chart",
  "/top",
  "/top-users",
  "/dedicaces",
  "/contact",
  "/soumission-artistes",
  "/newsletter",
  "/privacy",
  "/terms",
  "/auth",
  "/reset-password",
];

function collect(document) {
  const links = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({
    hreflang: l.getAttribute("hreflang"),
    href: l.getAttribute("href"),
  }));
  const ogLocale = [...document.head.querySelectorAll('meta[property="og:locale"]')].map((m) => m.getAttribute("content"));
  const ogLocaleAlt = [...document.head.querySelectorAll('meta[property="og:locale:alternate"]')].map((m) => m.getAttribute("content"));
  const title = document.title;
  const desc = document.head.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  return { links, ogLocale, ogLocaleAlt, title, desc };
}

function validate(path, lang, snapshot) {
  const errs = [];
  const wanted = new Set(["fr", "en", "x-default"]);
  const seen = new Map();
  for (const l of snapshot.links) {
    if (!wanted.has(l.hreflang)) errs.push(`unexpected hreflang="${l.hreflang}"`);
    if (seen.has(l.hreflang)) errs.push(`duplicate hreflang="${l.hreflang}"`);
    seen.set(l.hreflang, l.href);
    if (!l.href || !/^https?:\/\//.test(l.href)) errs.push(`hreflang="${l.hreflang}" has invalid href="${l.href}"`);
  }
  for (const k of wanted) if (!seen.has(k)) errs.push(`missing hreflang="${k}"`);
  if (seen.get("fr") && !seen.get("fr").includes("hl=fr")) errs.push(`hreflang=fr must carry ?hl=fr (got ${seen.get("fr")})`);
  if (seen.get("en") && !seen.get("en").includes("hl=en")) errs.push(`hreflang=en must carry ?hl=en (got ${seen.get("en")})`);
  if (seen.get("x-default") && /\?hl=/.test(seen.get("x-default"))) errs.push(`x-default should not carry ?hl (got ${seen.get("x-default")})`);

  if (snapshot.ogLocale.length !== 1) errs.push(`expected exactly 1 og:locale, got ${snapshot.ogLocale.length}`);
  const expectedLocale = lang === "en" ? "en_US" : "fr_FR";
  if (snapshot.ogLocale[0] !== expectedLocale) errs.push(`og:locale=${snapshot.ogLocale[0]} expected ${expectedLocale}`);

  if (snapshot.ogLocaleAlt.length !== 1) errs.push(`expected exactly 1 og:locale:alternate, got ${snapshot.ogLocaleAlt.length}`);
  const expectedAlt = lang === "en" ? "fr_FR" : "en_US";
  if (snapshot.ogLocaleAlt[0] !== expectedAlt) errs.push(`og:locale:alternate=${snapshot.ogLocaleAlt[0]} expected ${expectedAlt}`);

  if (!snapshot.title || snapshot.title.length < 3) errs.push(`empty title`);
  if (!snapshot.desc) errs.push(`empty description`);
  return errs;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let fail = 0;
let pass = 0;
const report = [];

for (const path of ROUTES) {
  for (const lang of ["fr", "en"]) {
    const url = `${BASE}${path}?hl=${lang}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      // Let SeoLocalizer effect run.
      await page.waitForFunction(
        (l) => document.head.querySelector(`link[rel="alternate"][hreflang="${l}"]`) !== null,
        lang,
        { timeout: 5000 },
      ).catch(() => {});
      const snap = await page.evaluate(collect);
      const errs = validate(path, lang, snap);
      if (errs.length) {
        fail++;
        report.push({ url, lang, ok: false, errs, snap });
        console.error(`FAIL ${url}`);
        for (const e of errs) console.error(`  - ${e}`);
      } else {
        pass++;
        console.log(`ok   ${url}  [${snap.title.slice(0, 60)}]`);
      }
    } catch (e) {
      fail++;
      report.push({ url, lang, ok: false, errs: [String(e?.message ?? e)] });
      console.error(`FAIL ${url}  ${e?.message ?? e}`);
    }
  }
}

await browser.close();

console.log(`\n${pass} passed, ${fail} failed, ${ROUTES.length * 2} total checks.`);
process.exit(fail ? 1 : 0);