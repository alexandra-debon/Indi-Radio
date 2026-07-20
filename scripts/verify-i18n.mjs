#!/usr/bin/env node
/**
 * i18n verification for the FR/EN dictionary and t()/useT() call sites.
 *
 * Reports, in this order:
 *   1. Keys defined in FR but missing/empty in EN
 *   2. Keys where the EN value is identical to the FR value
 *      (untranslated — allow-listed via ALLOWED_IDENTICAL below)
 *   3. Keys referenced in the source with t("…") / useT()("…")
 *      but absent from the FR dictionary
 *   4. Orphan keys defined in the dictionary but never referenced
 *      (warning only — some are used dynamically)
 *
 * Exit code: 1 if any hard error (1–3) is found, 0 otherwise.
 * Usage: `node scripts/verify-i18n.mjs`  or  `bun run verify:i18n`
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DICT_PATH = join(ROOT, "src/lib/i18n/dict.ts");
const SRC_DIR = join(ROOT, "src");

// Values that are legitimately identical in FR and EN (brand names, tokens,
// mostly-punctuation strings, universal words). Extend as needed.
const ALLOWED_IDENTICAL = new Set([
  "lang.current", "lang.toggle",
  "common.airplays", "common.likes", "common.votes",
  "nav.chart", "nav.top", "nav.contact",
  "footer.contact",
  "brand.name",
]);

function parseDict(src) {
  // Extract fr {…} and en {…} blocks by brace matching.
  const block = (label) => {
    const idx = src.indexOf(`${label}: {`);
    if (idx === -1) return {};
    let depth = 0, start = -1;
    for (let i = idx; i < src.length; i++) {
      const c = src[i];
      if (c === "{") { if (depth === 0) start = i + 1; depth++; }
      else if (c === "}") { depth--; if (depth === 0) return parseEntries(src.slice(start, i)); }
    }
    return {};
  };
  const parseEntries = (body) => {
    const out = {};
    const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(body))) out[m[1]] = m[2];
    return out;
  };
  return { fr: block("fr"), en: block("en") };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

function collectReferenced(files) {
  const referenced = new Map(); // key -> Set(file)
  // Matches t("key"), t('key'), useT()("key"), useT()('key')
  const re = /(?:\bt|useT\(\))\s*\(\s*["']([a-zA-Z0-9._-]+)["']\s*[),]/g;
  for (const f of files) {
    if (f.endsWith("scripts/verify-i18n.mjs")) continue;
    const src = readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(src))) {
      const k = m[1];
      if (!referenced.has(k)) referenced.set(k, new Set());
      referenced.get(k).add(f);
    }
  }
  return referenced;
}

function main() {
  const dictSrc = readFileSync(DICT_PATH, "utf8");
  const { fr, en } = parseDict(dictSrc);
  const files = walk(SRC_DIR);
  const referenced = collectReferenced(files);

  const missingEn = [];
  const untranslated = [];
  for (const k of Object.keys(fr)) {
    const v = en[k];
    if (v === undefined || v === "") missingEn.push(k);
    else if (v === fr[k] && !ALLOWED_IDENTICAL.has(k)) untranslated.push(k);
  }

  const missingKeys = [];
  for (const [k, files] of referenced) {
    if (!(k in fr)) missingKeys.push({ key: k, files: [...files] });
  }

  const orphans = Object.keys(fr).filter((k) => !referenced.has(k));

  const report = [];
  report.push(`i18n verify — FR keys: ${Object.keys(fr).length}, EN keys: ${Object.keys(en).length}\n`);

  const section = (title, items, fmt) => {
    report.push(`\n${title} (${items.length})`);
    if (items.length === 0) { report.push("  ✓ none"); return; }
    for (const it of items) report.push("  - " + fmt(it));
  };

  section("Missing or empty EN translations", missingEn, (k) => k);
  section("Untranslated (EN identical to FR)", untranslated,
    (k) => `${k}  fr=${JSON.stringify(fr[k])}`);
  section("Keys referenced in code but not in dictionary", missingKeys,
    ({ key, files }) => `${key}  (used in ${files.length} file${files.length > 1 ? "s" : ""}, e.g. ${files[0].replace(ROOT, "")})`);
  section("Orphan keys (defined but not referenced — warning only)", orphans, (k) => k);

  console.log(report.join("\n"));

  const hardErrors = missingEn.length + untranslated.length + missingKeys.length;
  if (hardErrors > 0) {
    console.error(`\n✗ i18n verify failed: ${hardErrors} issue(s).`);
    process.exit(1);
  }
  console.log(`\n✓ i18n verify passed.`);
}

main();