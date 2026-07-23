/**
 * Build a schema.org BreadcrumbList JSON-LD script object for TanStack Router
 * `head().scripts`. Pass ordered crumbs from root to current page.
 *
 * Example:
 *   breadcrumbLd([
 *     { name: "Accueil", url: "https://radio.indi-art-culture.com/" },
 *     { name: "Indi Rézo", url: "https://radio.indi-art-culture.com/actus" },
 *   ])
 */
export type Crumb = { name: string; url: string };

export function breadcrumbLd(items: Crumb[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    }),
  };
}

export const SITE_ORIGIN = "https://radio.indi-art-culture.com";
export const HOME_CRUMB: Crumb = { name: "Accueil", url: `${SITE_ORIGIN}/` };