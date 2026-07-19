#!/usr/bin/env node
/**
 * Post-publish health check.
 *
 * Usage:
 *   node scripts/post-publish-check.mjs [baseUrl]
 *
 * Defaults to https://radio.indi-art-culture.com.
 * Checks:
 *   - HTTP 200 on key endpoints
 *   - SSR rendered HTML contains expected markers (title, root markup)
 *   - /api/public/health returns { ok: true }
 *
 * Exits with code 1 if any check fails — safe to plug into CI after publish.
 */

const DEFAULT_BASE = "https://radio.indi-art-culture.com";
const base = (process.argv[2] || process.env.CHECK_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");

const TIMEOUT_MS = 15_000;

/** @type {{path: string, expectStatus?: number, expectContains?: (string | RegExp)[], json?: (body:any)=>boolean, label: string}[]} */
const CHECKS = [
  {
    label: "SSR home /",
    path: "/",
    expectStatus: 200,
    expectContains: [/<html/i, /InDi\s*RaDio/i, /<\/body>/i],
  },
  {
    label: "SSR /about",
    path: "/about",
    expectStatus: 200,
    expectContains: [/<html/i, /<\/body>/i],
  },
  {
    label: "SSR /contact",
    path: "/contact",
    expectStatus: 200,
    expectContains: [/<html/i, /<\/body>/i],
  },
  {
    label: "sitemap.xml",
    path: "/sitemap.xml",
    expectStatus: 200,
    expectContains: [/<urlset/i],
  },
  {
    label: "Health JSON",
    path: "/api/public/health",
    expectStatus: 200,
    json: (body) => body && body.ok === true,
  },
  {
    label: "Radio artwork endpoint",
    path: "/api/public/radio/artwork",
    expectStatus: 200,
  },
];

function fmtMs(ms) {
  return `${ms.toString().padStart(4, " ")}ms`;
}

async function runOne(check) {
  const url = base + check.path;
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "indi-post-publish-check/1.0" },
    });
    const ms = Date.now() - t0;
    const problems = [];
    if (check.expectStatus && res.status !== check.expectStatus) {
      problems.push(`status=${res.status} (expected ${check.expectStatus})`);
    }
    const text = await res.text();
    if (check.expectContains) {
      for (const marker of check.expectContains) {
        const ok = typeof marker === "string" ? text.includes(marker) : marker.test(text);
        if (!ok) problems.push(`missing marker: ${marker}`);
      }
    }
    if (check.json) {
      try {
        const parsed = JSON.parse(text);
        if (!check.json(parsed)) problems.push(`json predicate failed: ${text.slice(0, 200)}`);
      } catch (e) {
        problems.push(`invalid JSON: ${String(e)}`);
      }
    }
    return { check, ok: problems.length === 0, ms, status: res.status, problems };
  } catch (err) {
    return {
      check,
      ok: false,
      ms: Date.now() - t0,
      status: 0,
      problems: [`fetch failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\n▶ Post-publish check — ${base}\n`);
  const results = await Promise.all(CHECKS.map(runOne));
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${fmtMs(r.ms)}  ${String(r.status).padStart(3)}  ${r.check.label}  (${r.check.path})`);
    if (!r.ok) {
      failed++;
      for (const p of r.problems) console.log(`     └─ ${p}`);
    }
  }
  console.log(`\n${failed === 0 ? "✅ All checks passed" : `❌ ${failed} check(s) failed`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});