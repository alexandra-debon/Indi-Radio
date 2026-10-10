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

/**
 * Facebook, LinkedIn et WhatsApp ne lisent pas l'AVIF/HEIC : ils retombent
 * alors sur l'image générique du site. On fait passer ces images par un
 * convertisseur public (wsrv.nl) qui renvoie un JPEG 1200x630.
 */
export function facebookSafeImage(
  src: string,
  opts: { width?: number; height?: number; crop?: boolean; force?: boolean } = {},
): string {
  if (!/^https:\/\//i.test(src)) return src;
  if (/^https:\/\/wsrv\.nl\//i.test(src)) return src;
  const unreadable = /\.(avif|heic|heif)(\?|$)/i.test(src);
  // `force` : on convertit toujours (pochettes de chroniques, avatars,
  // bannières) en JPEG recadré 1200x630, conforme aux dimensions déclarées.
  if (!unreadable && !opts.force) return src;
  const params = new URLSearchParams({ url: src, output: "jpg", q: "85" });
  if (opts.crop !== false) {
    params.set("w", String(opts.width ?? 1200));
    params.set("h", String(opts.height ?? 630));
    params.set("fit", "cover");
  } else {
    params.set("w", "1200");
  }
  return `https://wsrv.nl/?${params.toString()}`;
}

export function ogImageTags(
  image: string,
  opts: {
    baseUrl: string;
    width?: number;
    height?: number;
    alt?: string;
    /**
     * Quand l'image n'est pas au format paysage 1200x630 (couverture de
     * magazine en portrait, par ex.), déclarer de fausses dimensions fait
     * recadrer ou refuser l'aperçu. Passer `false` pour les omettre.
     */
    declareSize?: boolean;
    /** Convertit aussi les WebP / formats douteux en JPEG 1200x630. */
    forceJpeg?: boolean;
  } = { baseUrl: "" },
): MetaTag[] {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;
  const abs = absoluteImage(image, opts.baseUrl);
  // Nos visuels statiques (JPEG/PNG du site) sont déjà au bon format. Toute
  // autre image (photos d'articles en WebP, liens signés, pochettes externes)
  // passe en JPEG aux dimensions déclarées : l'app Facebook ignore sinon
  // l'image et publie le lien sans miniature.
  const ownStatic =
    abs.startsWith(opts.baseUrl || "\u0000") && /\.(jpe?g|png)(\?|$)/i.test(abs);
  const src = facebookSafeImage(abs, {
    width,
    height,
    crop: opts.declareSize !== false,
    force: opts.forceJpeg ?? !ownStatic,
  });
  const type = /\.png(\?|$)/i.test(src)
    ? "image/png"
    : /\.webp(\?|$)/i.test(src)
      ? "image/webp"
      : "image/jpeg";
  const tags: MetaTag[] = [
    { property: "og:image", content: src },
    { property: "og:image:url", content: src },
    { property: "og:image:type", content: type },
    ...(opts.declareSize === false
      ? []
      : [
          { property: "og:image:width", content: String(width) },
          { property: "og:image:height", content: String(height) },
        ]),
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
