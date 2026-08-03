#!/usr/bin/env node
/**
 * Wait for a fresh deployment to be live, then run the routes availability
 * test. Exits with a non-zero code on failure so it can gate CI.
 *
 * Usage:
 *   bun run publish:verify                # waits ~90s then tests prod
 *   node scripts/publish-verify.mjs 30    # override wait (seconds)
 */
import { spawn } from "node:child_process";

const waitSec = Number(process.argv[2] ?? process.env.PUBLISH_WAIT_SEC ?? 90);
const base = process.env.CHECK_BASE_URL ?? "https://radio.indi-art-culture.com";

console.log(`[publish:verify] waiting ${waitSec}s for deploy to propagate on ${base}…`);
await new Promise((r) => setTimeout(r, waitSec * 1000));

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

console.log("[publish:verify] running post-publish HTTP checks…");
const checkCode = await run("node", ["scripts/post-publish-check.mjs", base]);

console.log("[publish:verify] running routes availability test suite…");
const testCode = await run("bunx", ["vitest", "run", "tests/routes-availability.test.ts"]);

console.log("[publish:verify] running RSS structure test suite…");
const rssCode = await run("bunx", ["vitest", "run", "tests/rss-feeds.test.ts"], {
  RSS_BASE_URL: base,
});

console.log("[publish:verify] running RSS platform compatibility test suite…");
const rssPlatformCode = await run("bunx", ["vitest", "run", "tests/rss-platforms.test.ts"], {
  RSS_BASE_URL: base,
});

console.log("[publish:verify] comparing RSS feeds with previous snapshot…");
const diffCode = await run("node", ["scripts/rss-diff.mjs"], { RSS_BASE_URL: base });

console.log("[publish:verify] running sitemap URL validity checks (200 / canonical / hreflang)…");
const urlsCode = await run("node", ["scripts/verify-urls.mjs"], { BASE_URL: base });

const failed =
  checkCode !== 0 ||
  testCode !== 0 ||
  rssCode !== 0 ||
  rssPlatformCode !== 0 ||
  diffCode !== 0 ||
  urlsCode !== 0;
if (failed) {
  console.error(
    `[publish:verify] ❌ FAILED (checks=${checkCode}, tests=${testCode}, rss=${rssCode}, rssPlatform=${rssPlatformCode}, rssDiff=${diffCode}, urls=${urlsCode}) — treat this deployment as broken.`,
  );
  process.exit(1);
}
console.log("[publish:verify] ✅ deployment verified");