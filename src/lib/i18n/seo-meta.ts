import type { Lang } from "./dict";

export type SeoEntry = {
  title: string;
  description: string;
};

export type SeoBundle = Record<Lang, SeoEntry>;

// Static routes (exact pathname match). Dynamic routes handled by prefix map below.
export const STATIC_SEO: Record<string, SeoBundle> = {
  "/": {
    fr: {
      title: "Radio gratuite 24/7 musique indépendante — InDi RaDio",
      description:
        "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio.",
    },
    en: {
      title: "Free 24/7 Independent Music Radio — InDi RaDio",
      description:
        "Free independent music radio 24/7, ad-free, no news. Listen to indie music and join the music social network on InDi RaDio.",
    },
  },
  "/about": {
    fr: {
      title: "À propos — Radio gratuite musique indépendante InDi RaDio",
      description: "InDi RaDio, radio gratuite musique indépendante 24/7 sans pub. Découvre la mission, l'équipe et le réseau social musique d'InDi ArT CulTuRe.",
    },
    en: {
      title: "About — Free Independent Music Radio InDi RaDio",
      description: "InDi RaDio, free independent music radio 24/7 ad-free. Discover the mission, team and music social network behind InDi ArT CulTuRe.",
    },
  },
  "/actus": {
    fr: { title: "Actus · Indi Rézo — Radio musique indé InDi RaDio", description: "Toute l'actu de la scène indépendante et du réseau social musique InDi ArT CulTuRe. Radio musique indé, clips, chroniques et podcasts." },
    en: { title: "News · Indi Rézo — Indie Music Social Network InDi RaDio", description: "All the news from the independent scene and the InDi RaDio music social network. Indie music, clips, reviews and podcasts." },
  },
  "/podcasts": {
    fr: { title: "Podcasts — InDi RaDio", description: "Écoute les podcasts d'InDi RaDio : interviews, émissions et chroniques d'artistes indépendants." },
    en: { title: "Podcasts — InDi RaDio", description: "Listen to InDi RaDio podcasts: interviews, shows and columns from independent artists." },
  },
  "/emissions": {
    fr: { title: "Émissions — InDi RaDio", description: "Retrouve toutes les émissions d'InDi RaDio et leurs épisodes en replay." },
    en: { title: "Shows — InDi RaDio", description: "Browse every InDi RaDio show and catch up on episodes on demand." },
  },
  "/chroniques": {
    fr: { title: "Chroniques — InDi RaDio", description: "Les chroniques audio d'InDi RaDio : coups de cœur, critiques et découvertes." },
    en: { title: "Columns — InDi RaDio", description: "InDi RaDio audio columns: favorites, reviews and discoveries." },
  },
  "/magazines": {
    fr: { title: "Magazine Indi Art Culture — InDi RaDio", description: "Feuillette le magazine interactif Indi Art Culture." },
    en: { title: "Indi Art Culture Magazine — InDi RaDio", description: "Flip through the interactive Indi Art Culture magazine." },
  },
  "/clips": {
    fr: { title: "Clip Addict — InDi RaDio", description: "La playlist vidéo des clips indépendants sélectionnés par InDi RaDio." },
    en: { title: "Clip Addict — InDi RaDio", description: "The video playlist of independent music clips curated by InDi RaDio." },
  },
  "/chart": {
    fr: { title: "Top 25 des titres — InDi RaDio", description: "Le classement des 25 titres les plus aimés par la communauté InDi RaDio." },
    en: { title: "Top 25 Tracks — InDi RaDio", description: "The chart of the 25 most-loved tracks by the InDi RaDio community." },
  },
  "/top": {
    fr: { title: "Top podcasts & chroniques — InDi RaDio", description: "Les podcasts et chroniques les plus écoutés sur InDi RaDio." },
    en: { title: "Top podcasts & columns — InDi RaDio", description: "The most-listened podcasts and columns on InDi RaDio." },
  },
  "/top-users": {
    fr: { title: "Top 25 utilisateurs — InDi RaDio", description: "Les 25 utilisateurs les plus actifs de la communauté InDi RaDio." },
    en: { title: "Top 25 Users — InDi RaDio", description: "The 25 most active users in the InDi RaDio community." },
  },
  "/dedicaces": {
    fr: { title: "Dédicaces — InDi RaDio", description: "Envoie une dédicace à l'antenne d'InDi RaDio." },
    en: { title: "Shout-outs — InDi RaDio", description: "Send a shout-out to be played on InDi RaDio." },
  },
  "/contact": {
    fr: { title: "Contact — InDi RaDio", description: "Contacte l'équipe InDi RaDio et InDi ArT CulTuRe." },
    en: { title: "Contact — InDi RaDio", description: "Get in touch with the InDi RaDio and InDi ArT CulTuRe team." },
  },
  "/soumission-artistes": {
    fr: { title: "Soumission artistes — InDi RaDio", description: "Artistes indépendants : proposez vos titres à la diffusion sur InDi RaDio." },
    en: { title: "Artist submissions — InDi RaDio", description: "Independent artists: submit your tracks to be played on InDi RaDio." },
  },
  "/newsletter": {
    fr: { title: "Newsletter — InDi RaDio", description: "Inscris-toi à la newsletter InDi RaDio et reste connecté à la scène indé." },
    en: { title: "Newsletter — InDi RaDio", description: "Subscribe to the InDi RaDio newsletter and stay tuned to the indie scene." },
  },
  "/privacy": {
    fr: { title: "Politique de confidentialité — InDi RaDio", description: "Comment InDi RaDio protège et traite tes données personnelles." },
    en: { title: "Privacy Policy — InDi RaDio", description: "How InDi RaDio protects and processes your personal data." },
  },
  "/terms": {
    fr: { title: "Conditions d'utilisation — InDi RaDio", description: "Les conditions générales d'utilisation d'InDi RaDio." },
    en: { title: "Terms of Use — InDi RaDio", description: "The InDi RaDio terms of use." },
  },
  "/auth": {
    fr: { title: "Connexion — InDi RaDio", description: "Connecte-toi à ton compte InDi RaDio." },
    en: { title: "Sign in — InDi RaDio", description: "Sign in to your InDi RaDio account." },
  },
  "/reset-password": {
    fr: { title: "Réinitialiser le mot de passe — InDi RaDio", description: "Réinitialise ton mot de passe InDi RaDio." },
    en: { title: "Reset password — InDi RaDio", description: "Reset your InDi RaDio password." },
  },
};

// Prefix map for dynamic routes (nearest-longest-prefix match).
export const PREFIX_SEO: Array<{ prefix: string; bundle: SeoBundle }> = [
  { prefix: "/actus/", bundle: {
    fr: { title: "Actualité — InDi RaDio", description: "Article d'actualité indépendant publié sur InDi RaDio." },
    en: { title: "News article — InDi RaDio", description: "Independent news article published on InDi RaDio." },
  } },
  { prefix: "/emissions/", bundle: {
    fr: { title: "Émission — InDi RaDio", description: "Découvre cette émission d'InDi RaDio et ses épisodes." },
    en: { title: "Show — InDi RaDio", description: "Discover this InDi RaDio show and its episodes." },
  } },
  { prefix: "/episodes/", bundle: {
    fr: { title: "Épisode — InDi RaDio", description: "Écoute cet épisode en replay sur InDi RaDio." },
    en: { title: "Episode — InDi RaDio", description: "Listen to this episode on demand on InDi RaDio." },
  } },
  { prefix: "/chroniques/", bundle: {
    fr: { title: "Chronique — InDi RaDio", description: "Chronique audio publiée sur InDi RaDio." },
    en: { title: "Column — InDi RaDio", description: "Audio column published on InDi RaDio." },
  } },
  { prefix: "/magazines/", bundle: {
    fr: { title: "Magazine — Indi Art Culture", description: "Numéro interactif du magazine Indi Art Culture." },
    en: { title: "Magazine — Indi Art Culture", description: "Interactive issue of the Indi Art Culture magazine." },
  } },
  { prefix: "/clips/", bundle: {
    fr: { title: "Clip — InDi RaDio", description: "Clip vidéo indépendant sélectionné par InDi RaDio." },
    en: { title: "Clip — InDi RaDio", description: "Independent music video curated by InDi RaDio." },
  } },
  { prefix: "/p/", bundle: {
    fr: { title: "Publication — InDi RaDio", description: "Publication du mur social InDi RaDio." },
    en: { title: "Post — InDi RaDio", description: "Post from the InDi RaDio social wall." },
  } },
  { prefix: "/tag/", bundle: {
    fr: { title: "Hashtag — InDi RaDio", description: "Toutes les publications autour de ce hashtag sur InDi RaDio." },
    en: { title: "Hashtag — InDi RaDio", description: "All posts tagged with this hashtag on InDi RaDio." },
  } },
  { prefix: "/u/", bundle: {
    fr: { title: "Profil — InDi RaDio", description: "Profil public d'un membre de la communauté InDi RaDio." },
    en: { title: "Profile — InDi RaDio", description: "Public profile of an InDi RaDio community member." },
  } },
];

export function resolveSeo(pathname: string): SeoBundle | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (STATIC_SEO[clean]) return STATIC_SEO[clean];
  // longest prefix wins
  let best: SeoBundle | null = null;
  let bestLen = -1;
  for (const { prefix, bundle } of PREFIX_SEO) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      best = bundle;
      bestLen = prefix.length;
    }
  }
  return best;
}