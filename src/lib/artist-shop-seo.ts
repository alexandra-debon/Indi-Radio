import type { OgLang } from "@/lib/og-lang";
import { clampDescription } from "@/lib/i18n/seo-meta";

type ShopPreviewItem = { image_url: string | null; is_visible: boolean };

export function artistShopPreviewImage(
  items: ShopPreviewItem[],
  banner: string | null | undefined,
  avatar: string | null | undefined,
): string | null {
  return items.find((item) => item.is_visible && /^https:\/\//i.test(item.image_url ?? ""))?.image_url
    || [banner, avatar].find((image) => /^https:\/\//i.test(image ?? ""))
    || null;
}

export function artistShopSeo(name: string, lang: OgLang) {
  return lang === "en"
    ? {
        title: `${name} Shop | Buy directly from artists`,
        description: clampDescription(`Buy directly from artists: discover ${name}'s shop on InDi RaDio. Shop through the artist's own links, with 0% commission and 100% going to the artist.`),
        imageAlt: `${name} — buy directly from artists`,
      }
    : {
        title: `${name} — Boutique | Acheter directement aux artistes`,
        description: clampDescription(`Acheter directement aux artistes : découvrez la boutique de ${name} sur InDi RaDio. Liens d'achat de l'artiste, 0 % de commission, 100 % reversé à l'artiste.`),
        imageAlt: `${name} — acheter directement aux artistes`,
      };
}

/** A share-sized JPEG rendition of the actual product or artist photo. */
export function artistShopThumbnail(image: string): string {
  const params = new URLSearchParams({ url: image, output: "jpg", q: "85", w: "1200", h: "630", fit: "cover" });
  return `https://wsrv.nl/?${params.toString()}`;
}