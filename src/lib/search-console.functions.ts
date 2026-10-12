import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET = "https://www.radio.indi-art-culture.com/";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Réservé aux administrateurs.");
}

function headers() {
  const a = process.env.LOVABLE_API_KEY;
  const b = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!a || !b) throw new Error("Connexion Google Search Console manquante");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b, "Content-Type": "application/json" };
}

async function gsc(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: headers() });
  if (!res.ok) throw new Error(`Google Search Console [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  const t = await res.text();
  return t ? JSON.parse(t) : {};
}

/** Lists verified properties and picks the one covering the site (prefers exact root URL-prefix). */
async function resolveSite(): Promise<string> {
  const { siteEntry = [] } = (await gsc("/webmasters/v3/sites")) as {
    siteEntry?: { siteUrl: string; permissionLevel?: string }[];
  };
  const target = new URL(TARGET);
  const matches = siteEntry.filter((e) => {
    if (e.permissionLevel === "siteUnverifiedUser") return false;
    if (e.siteUrl.startsWith("sc-domain:")) {
      const d = e.siteUrl.slice(10).toLowerCase();
      return target.hostname === d || target.hostname.endsWith(`.${d}`);
    }
    try { return target.href.startsWith(new URL(e.siteUrl).href); } catch { return false; }
  });
  const exact = matches.find((m) => m.siteUrl === TARGET);
  const pick = exact ?? matches[0];
  if (!pick) throw new Error("Aucune propriété Search Console vérifiée pour ce site");
  return pick.siteUrl;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export const getSearchConsoleOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const siteUrl = await resolveSite();
    const enc = encodeURIComponent(siteUrl);
    const end = new Date(Date.now() - 3 * 86400000);
    const start = new Date(end.getTime() - 27 * 86400000);
    const pEnd = new Date(start.getTime() - 86400000);
    const pStart = new Date(pEnd.getTime() - 27 * 86400000);
    const q = (body: Record<string, unknown>) =>
      gsc(`/webmasters/v3/sites/${enc}/searchAnalytics/query`, { method: "POST", body: JSON.stringify(body) });
    const range = { startDate: ymd(start), endDate: ymd(end) };
    const [tot, prev, queries, pages, daily, countries, sitemaps] = await Promise.all([
      q(range),
      q({ startDate: ymd(pStart), endDate: ymd(pEnd) }),
      q({ ...range, dimensions: ["query"], rowLimit: 25 }),
      q({ ...range, dimensions: ["page"], rowLimit: 25 }),
      q({ ...range, dimensions: ["date"], rowLimit: 60 }),
      q({ ...range, dimensions: ["country"], rowLimit: 8 }),
      gsc(`/webmasters/v3/sites/${enc}/sitemaps`).catch(() => ({ sitemap: [] })),
    ]);
    const first = (r: { rows?: Row[] }) => r.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return {
      siteUrl,
      range,
      totals: first(tot),
      previous: first(prev),
      queries: (queries.rows ?? []) as Row[],
      pages: (pages.rows ?? []) as Row[],
      daily: (daily.rows ?? []) as Row[],
      countries: (countries.rows ?? []) as Row[],
      sitemaps: ((sitemaps.sitemap ?? []) as any[]).map((s) => ({
        path: String(s.path),
        lastSubmitted: s.lastSubmitted ?? null,
        lastDownloaded: s.lastDownloaded ?? null,
        isPending: Boolean(s.isPending),
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
        submitted: Number(s.contents?.[0]?.submitted ?? 0),
      })),
    };
  });

export const inspectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ url: z.string().url().max(500) }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const siteUrl = await resolveSite();
    const r = await gsc("/v1/urlInspection/index:inspect", {
      method: "POST",
      body: JSON.stringify({ inspectionUrl: data.url, siteUrl, languageCode: "fr" }),
    });
    const s = r.inspectionResult?.indexStatusResult ?? {};
    return {
      siteUrl,
      verdict: (s.verdict ?? "UNKNOWN") as string,
      coverageState: (s.coverageState ?? null) as string | null,
      lastCrawlTime: (s.lastCrawlTime ?? null) as string | null,
      googleCanonical: (s.googleCanonical ?? null) as string | null,
      pageFetchState: (s.pageFetchState ?? null) as string | null,
      inspectLink: (r.inspectionResult?.inspectionResultLink ?? null) as string | null,
    };
  });

export const resubmitSitemaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const siteUrl = await resolveSite();
    const enc = encodeURIComponent(siteUrl);
    const base = siteUrl.startsWith("sc-domain:") ? TARGET : siteUrl;
    const maps = ["sitemap.xml", "sitemap-fr.xml", "sitemap-en.xml"].map((m) => new URL(m, base).href);
    for (const m of maps) {
      await gsc(`/webmasters/v3/sites/${enc}/sitemaps/${encodeURIComponent(m)}`, { method: "PUT" });
    }
    return { submitted: maps };
  });
