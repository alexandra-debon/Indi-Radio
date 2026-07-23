// Map of legacy URLs → current canonical paths (301 redirects).
// Add entries here as old links are discovered. Keys are lowercased
// pathnames WITHOUT trailing slash and WITHOUT query string.
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/index": "/",
  "/index.html": "/",
  "/home": "/",
  "/accueil": "/",

  // Content sections
  "/news": "/actus",
  "/actualites": "/actus",
  "/actualité": "/actus",
  "/actualités": "/actus",
  "/blog": "/actus",
  "/articles": "/actus",
  "/post": "/actus",
  "/posts": "/actus",

  "/podcast": "/podcasts",
  "/emission": "/emissions",
  "/émissions": "/emissions",
  "/émission": "/emissions",
  "/shows": "/emissions",
  "/show": "/emissions",

  "/chronique": "/chroniques",
  "/chroniks": "/chroniques",
  "/replay": "/chroniques",

  "/magazine": "/magazines",
  "/clip": "/clips",
  "/videos": "/clips",
  "/video": "/clips",

  "/charts": "/chart",
  "/top25": "/chart",
  "/top-25": "/chart",
  "/topusers": "/top-users",
  "/top-user": "/top-users",
  "/top-artists": "/top",
  "/topartists": "/top",

  "/favoris": "/coups-de-coeur",
  "/favorites": "/coups-de-coeur",
  "/coup-de-coeur": "/coups-de-coeur",
  "/coupdecoeur": "/coups-de-coeur",
  "/coupsdecoeur": "/coups-de-coeur",

  // Institutional
  "/apropos": "/about",
  "/a-propos": "/about",
  "/à-propos": "/about",
  "/qui-sommes-nous": "/about",

  "/mentions-legales": "/terms",
  "/mentions-légales": "/terms",
  "/cgu": "/terms",
  "/cgv": "/terms",
  "/conditions": "/terms",

  "/confidentialite": "/privacy",
  "/confidentialité": "/privacy",
  "/politique-de-confidentialite": "/privacy",

  "/moderations": "/moderation",
  "/modération": "/moderation",

  "/soumission": "/soumission-artistes",
  "/soumissions": "/soumission-artistes",
  "/artistes": "/soumission-artistes",
  "/submit": "/soumission-artistes",

  "/contactez-nous": "/contact",
  "/nous-contacter": "/contact",

  "/newsletter/subscribe": "/newsletter",
  "/inscription-newsletter": "/newsletter",

  "/login": "/auth",
  "/signin": "/auth",
  "/signup": "/auth",
  "/register": "/auth",
  "/connexion": "/auth",
  "/inscription": "/auth",

  "/dedicace": "/dedicaces",
  "/dedication": "/dedicaces",
  "/dedications": "/dedicaces",
};

/**
 * Given a pathname, return a redirect target if it matches a legacy URL,
 * otherwise null. Strips trailing slash and lowercases before lookup.
 */
export function resolveLegacyRedirect(pathname: string): string | null {
  if (!pathname) return null;
  // Normalize
  let key = pathname.toLowerCase();
  if (key.length > 1 && key.endsWith("/")) key = key.slice(0, -1);

  const direct = LEGACY_REDIRECTS[key];
  if (direct) return direct;

  // Handle single trailing-slash normalization for any known route
  // (301 /foo/ → /foo). Only when pathname ends with "/" and isn't root.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return null;
}