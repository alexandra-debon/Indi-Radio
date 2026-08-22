import type { MetaTag } from "@/lib/og-tags";
import { OG_SITE_NAME } from "@/lib/og-tags";

export type OgLang = "fr" | "en";

/** Langue de partage active, dictée par l'URL (?hl=en). */
export function hlFromSearch(search: unknown): OgLang {
  const hl = (search as Record<string, unknown> | undefined)?.["hl"];
  return hl === "en" ? "en" : "fr";
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$)/i;

/**
 * Aligne une URL partagée sur la langue réellement active.
 * - retire tout `hl=` déjà présent (sinon un ancien `hl=en` reste collé et
 *   tous les partages suivants pointent vers la version anglaise)
 * - ajoute `hl=en` uniquement en anglais ; en français l'URL reste nue
 * - nettoie les paramètres de tracking parasites
 */
export function withHl(url: string, lang: OgLang): string {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://www.radio.indi-art-culture.com";
    const u = new URL(url, base);
    u.searchParams.delete("hl");
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    if (lang === "en") u.searchParams.set("hl", "en");
    return u.toString();
  } catch {
    return url;
  }
}


/** og:site_name + locale active et alternative. */
export function ogLocaleTags(lang: OgLang = "fr"): MetaTag[] {
  return [
    { property: "og:site_name", content: OG_SITE_NAME },
    { property: "og:locale", content: lang === "en" ? "en_US" : "fr_FR" },
    { property: "og:locale:alternate", content: lang === "en" ? "fr_FR" : "en_US" },
  ];
}

export function ogUrlForLang(url: string, lang: OgLang): string {
  return withHl(url, lang);
}
