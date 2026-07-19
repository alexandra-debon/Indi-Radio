import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://radio.indi-art-culture.com";
const TIMEOUT_MS = 15_000;

type Check = {
  label: string;
  path: string;
  expectStatus: number;
  expectContains?: RegExp[];
  json?: (b: unknown) => boolean;
};

const CHECKS: Check[] = [
  { label: "SSR home /", path: "/", expectStatus: 200, expectContains: [/<html/i, /InDi\s*RaDio/i, /<\/body>/i] },
  { label: "SSR /about", path: "/about", expectStatus: 200, expectContains: [/<html/i, /<\/body>/i] },
  { label: "SSR /contact", path: "/contact", expectStatus: 200, expectContains: [/<html/i, /<\/body>/i] },
  { label: "sitemap.xml", path: "/sitemap.xml", expectStatus: 200, expectContains: [/<urlset/i] },
  {
    label: "Health JSON",
    path: "/api/public/health",
    expectStatus: 200,
    json: (b) => !!(b && typeof b === "object" && (b as { ok?: unknown }).ok === true),
  },
  { label: "Radio artwork", path: "/api/public/radio/artwork", expectStatus: 200 },
];

export type DeployCheckResult = {
  label: string;
  path: string;
  ok: boolean;
  status: number;
  ms: number;
  problems: string[];
};

async function runOne(check: Check): Promise<DeployCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(BASE_URL + check.path, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "indi-post-publish-check/1.0", "cache-control": "no-cache" },
    });
    const ms = Date.now() - t0;
    const problems: string[] = [];
    if (res.status !== check.expectStatus) problems.push(`status ${res.status} (attendu ${check.expectStatus})`);
    const text = await res.text();
    if (check.expectContains) {
      for (const marker of check.expectContains) {
        if (!marker.test(text)) problems.push(`marqueur manquant: ${marker}`);
      }
    }
    if (check.json) {
      try {
        if (!check.json(JSON.parse(text))) problems.push(`réponse JSON inattendue`);
      } catch {
        problems.push(`JSON invalide`);
      }
    }
    return { label: check.label, path: check.path, ok: problems.length === 0, status: res.status, ms, problems };
  } catch (err) {
    return {
      label: check.label,
      path: check.path,
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      problems: [`fetch failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  } finally {
    clearTimeout(timer);
  }
}

export const runDeployCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin-only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const results = await Promise.all(CHECKS.map(runOne));
    const failed = results.filter((r) => !r.ok).length;
    return {
      baseUrl: BASE_URL,
      checkedAt: new Date().toISOString(),
      ok: failed === 0,
      failed,
      total: results.length,
      results,
    };
  });