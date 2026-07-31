import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n/dict";
import { resolveSeo, type SeoEntry } from "@/lib/i18n/seo-meta";

export const SITE_ORIGIN = "https://radio.indi-art-culture.com";

export type SeoOverrideRow = {
  id: string;
  path: string;
  lang: Lang;
  title: string | null;
  description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  keywords: string | null;
  noindex: boolean;
  updated_at: string;
};

export type SeoOverrideInput = {
  path: string;
  lang: Lang;
  title?: string | null;
  description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  keywords?: string | null;
  noindex?: boolean;
};

/** Normalize a pathname: strip query/hash and trailing slashes. */
export function normalizePath(p: string): string {
  const clean = (p.split("?")[0] ?? p).split("#")[0] ?? p;
  return clean.replace(/\/+$/, "") || "/";
}

export async function fetchSeoOverrides(): Promise<SeoOverrideRow[]> {
  const { data, error } = await supabase
    .from("seo_overrides")
    .select("id, path, lang, title, description, og_image_url, canonical_url, keywords, noindex, updated_at")
    .order("path", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeoOverrideRow[];
}

export function indexOverrides(rows: SeoOverrideRow[]): Map<string, SeoOverrideRow> {
  const m = new Map<string, SeoOverrideRow>();
  for (const r of rows) m.set(`${normalizePath(r.path)}|${r.lang}`, r);
  return m;
}

export function findOverride(
  map: Map<string, SeoOverrideRow>,
  pathname: string,
  lang: Lang,
): SeoOverrideRow | null {
  return map.get(`${normalizePath(pathname)}|${lang}`) ?? null;
}

/** Default (code-level) SEO values for a path, when they exist. */
export function defaultSeo(pathname: string, lang: Lang): SeoEntry | null {
  const bundle = resolveSeo(normalizePath(pathname));
  return bundle ? bundle[lang] : null;
}

export async function saveSeoOverride(input: SeoOverrideInput): Promise<void> {
  const payload = {
    path: normalizePath(input.path),
    lang: input.lang,
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    og_image_url: input.og_image_url?.trim() || null,
    canonical_url: input.canonical_url?.trim() || null,
    keywords: input.keywords?.trim() || null,
    noindex: input.noindex ?? false,
  };
  const { error } = await supabase
    .from("seo_overrides")
    .upsert(payload, { onConflict: "path,lang" });
  if (error) throw error;
}

export async function deleteSeoOverride(path: string, lang: Lang): Promise<void> {
  const { error } = await supabase
    .from("seo_overrides")
    .delete()
    .eq("path", normalizePath(path))
    .eq("lang", lang);
  if (error) throw error;
}

/** Best-effort IndexNow ping so search engines re-crawl the edited URL. */
export async function pingIndexNow(path: string): Promise<void> {
  try {
    await fetch("/api/public/hooks/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraUrls: [`${SITE_ORIGIN}${normalizePath(path)}`] }),
    });
  } catch {
    /* non blocking */
  }
}
