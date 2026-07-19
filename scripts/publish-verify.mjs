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

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

console.log("[publish:verify] running post-publish HTTP checks…");
const checkCode = await run("node", ["scripts/post-publish-check.mjs", base]);

console.log("[publish:verify] running routes availability test suite…");
const testCode = await run("bunx", ["vitest", "run", "tests/routes-availability.test.ts"]);

const failed = checkCode !== 0 || testCode !== 0;
if (failed) {
  console.error(`[publish:verify] ❌ FAILED (checks=${checkCode}, tests=${testCode}) — treat this deployment as broken.`);
  process.exit(1);
}
console.log("[publish:verify] ✅ deployment verified");