/**
 * Images de partage (Open Graph / Twitter) localisées + cache-busting.
 *
 * Facebook, LinkedIn et consorts mettent l'aperçu en cache par URL. Deux
 * leviers ici :
 *  1. l'image dépend de la langue active (`/og-fr.jpg` ou `/og-en.jpg`), donc
 *     un lien `?hl=en` n'affiche jamais l'image française ;
 *  2. toutes les URL d'images portent `?v=OG_ASSET_VERSION`. Il suffit
 *     d'incrémenter cette constante quand le logo ou le visuel change pour
 *     que les plateformes considèrent l'image comme neuve et la re-téléchargent.
 */
export const OG_SITE_URL = "https://www.radio.indi-art-culture.com";

/** Bump this whenever the logo / share visuals change. */
export const OG_ASSET_VERSION = "20260823-logo2";

export type OgImgLang = "fr" | "en";

/** Ajoute (ou remplace) le paramètre de version sur une URL d'asset. */
export function withAssetVersion(url: string): string {
  try {
    const u = new URL(url, OG_SITE_URL);
    u.searchParams.set("v", OG_ASSET_VERSION);
    return u.toString();
  } catch {
    return url;
  }
}

/** Image de partage 1200x630 correspondant à la langue active. */
export function ogImageForLang(lang: OgImgLang = "fr"): string {
  return withAssetVersion(`${OG_SITE_URL}/og-${lang === "en" ? "en" : "fr"}.jpg`);
}

/** Vrai si l'URL pointe vers une image de partage générique du site. */
export function isDefaultOgImage(url: string | undefined): boolean {
  if (!url) return false;
  return /\/og-(fr|en|home)[.-]|\/og-home/.test(url);
}

/** Alt localisé pour l'image de partage. */
export function ogImageAlt(lang: OgImgLang = "fr"): string {
  return lang === "en"
    ? "InDi RaDio — free 24/7 independent music radio"
    : "InDi RaDio — radio gratuite 24/7 de la musique indépendante";
}
