/**
 * Source unique de vérité pour la canonisation des URL publiques.
 *
 * Règles appliquées partout (head() des routes, SeoLocalizer, sitemaps) :
 *  - origine unique : apex https (pas de www, pas de http)
 *  - pas de slash final (sauf la racine "/")
 *  - pas de fragment (#…)
 *  - aucun paramètre de requête conservé, SAUF :
 *      · `hl`   → variante linguistique indexable (fr / en)
 *      · `page` → pagination, uniquement à partir de la page 2
 *  - les paramètres de tracking (utm_*, fbclid, gclid, ref…) sont ignorés
 */

export const SITE_ORIGIN = "https://www.radio.indi-art-culture.com";

/** Chemin normalisé : sans query, sans hash, sans slash final. */
export function canonicalPath(input: string): string {
  const noHash = (input.split("#")[0] ?? input);
  const noQuery = (noHash.split("?")[0] ?? noHash);
  const collapsed = ("/" + noQuery).replace(/\/{2,}/g, "/");
  return collapsed.replace(/\/+$/, "") || "/";
}

export type CanonicalOptions = {
  /** Langue active : "en" ajoute ?hl=en, "fr" reste l'URL nue. */
  lang?: string | null;
  /** Numéro de page : ignoré si <= 1. */
  page?: number | null;
};

/** URL canonique absolue et déterministe pour un chemin donné. */
export function canonicalUrl(path: string, opts: CanonicalOptions = {}): string {
  const p = canonicalPath(path);
  const params: string[] = [];
  if (opts.lang && opts.lang !== "fr") params.push(`hl=${encodeURIComponent(opts.lang)}`);
  const page = Number(opts.page ?? 0);
  if (Number.isFinite(page) && page > 1) params.push(`page=${Math.floor(page)}`);
  return `${SITE_ORIGIN}${p === "/" ? "/" : p}${params.length ? `?${params.join("&")}` : ""}`;
}

/**
 * Alternates hreflang cohérents avec la canonique.
 *  - `fr-FR`     : ciblage France (URL nue)
 *  - `fr`        : repli francophone (Belgique, Suisse, Canada…)
 *  - `en`        : anglais international (« en-XX »), porte ?hl=en
 *  - `x-default` : URL nue
 */
export function hreflangUrls(path: string, page?: number | null) {
  const base = canonicalUrl(path, { page });
  return {
    frFR: canonicalUrl(path, { lang: "fr", page }),
    fr: canonicalUrl(path, { lang: "fr", page }),
    en: canonicalUrl(path, { lang: "en", page }),
    xDefault: base,
  };
}

/** Lien `links: []` prêt à l'emploi pour le head() d'une route. */
export function canonicalLink(path: string, opts: CanonicalOptions = {}) {
  return { rel: "canonical", href: canonicalUrl(path, opts) } as const;
}
