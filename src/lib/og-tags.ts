/**
 * Tags Open Graph partagés pour toutes les pages de contenu.
 *
 * Facebook / LinkedIn / Substack refusent d'afficher un aperçu quand
 * l'image n'est pas absolue, quand ses dimensions ne sont pas déclarées
 * ou quand `og:site_name` / `og:locale` manquent. WhatsApp, lui, se
 * contente de `og:image` — d'où la différence de comportement observée.
 */
export type MetaTag = { name?: string; property?: string; content: string };

export const OG_SITE_NAME = "InDi RaDio";

/** Rend une URL d'image absolue (https) à partir d'une base. */
export function absoluteImage(image: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(image)) return image;
  return `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;
}

export function ogImageTags(
  image: string,
  opts: { baseUrl: string; width?: number; height?: number; alt?: string } = { baseUrl: "" },
): MetaTag[] {
  const src = absoluteImage(image, opts.baseUrl);
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;
  const type = /\.png(\?|$)/i.test(src)
    ? "image/png"
    : /\.webp(\?|$)/i.test(src)
      ? "image/webp"
      : "image/jpeg";
  const tags: MetaTag[] = [
    { property: "og:image", content: src },
    { property: "og:image:url", content: src },
    { property: "og:image:type", content: type },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { name: "twitter:image", content: src },
  ];
  if (src.startsWith("https://")) {
    tags.splice(1, 0, { property: "og:image:secure_url", content: src });
  }
  if (opts.alt) {
    tags.push({ property: "og:image:alt", content: opts.alt });
    tags.push({ name: "twitter:image:alt", content: opts.alt });
  }
  return tags;
}

/** Tags communs à toutes les pages partageables. */
export function ogCommonTags(locale = "fr_FR"): MetaTag[] {
  return [
    { property: "og:site_name", content: OG_SITE_NAME },
    { property: "og:locale", content: locale },
  ];
}

/** Tags vidéo (Facebook exige og:video:* quand og:type = video.*). */
export function ogVideoTags(embedUrl: string): MetaTag[] {
  return [
    { property: "og:video", content: embedUrl },
    { property: "og:video:secure_url", content: embedUrl },
    { property: "og:video:type", content: "text/html" },
    { property: "og:video:width", content: "1280" },
    { property: "og:video:height", content: "720" },
  ];
}