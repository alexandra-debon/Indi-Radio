import { useLang } from "@/lib/i18n";

/** Libellés FR/EN de RéDaK'Village (évite le texte brut dans le JSX). */
export const VILLAGE_NAME = "RéDaK'Village";

export const VILLAGE_INTRO_FR =
  "Ici c'est un espace de découverte, de plaisir d'écrire, d'échange sur la musique indé et la culture indé. On compte sur vous et vos belles plumes.";

const FR = {
  intro: VILLAGE_INTRO_FR,
  subtitle: "Les articles écrits par la communauté : auditeurs-lecteurs, artistes et médias.",
  write: "Écrire un article",
  empty: "Aucun article pour l'instant. Soyez la première plume !",
  title: "Titre",
  excerpt: "Accroche (courte)",
  content: "Votre article",
  cover: "Image de couverture",
  video: "Lien vidéo (YouTube / Vimeo, optionnel)",
  publish: "Publier l'article",
  update: "Enregistrer les modifications",
  cancel: "Annuler",
  edit: "Modifier",
  remove: "Supprimer",
  removeConfirm: "Supprimer définitivement cet article ?",
  byline: "Par",
  readMore: "Lire l'article",
  diffusion: "Diffusion",
  onFeed: "Afficher aussi un aperçu sur le mur En direct",
  villageOnly: "Seulement dans RéDaK'Village",
  warnTitle: "Votre article sera public",
  warnBody:
    "Tout le monde pourra le lire et le partager sur d'autres plateformes. Vous pouvez le modifier ou le supprimer à tout moment, mais les partages déjà effectués par des tiers (réseaux sociaux, captures, copies) peuvent continuer d'exister ailleurs : cela échappe au contrôle d'InDi RaDio.",
  warnAck: "J'ai compris",
  warnConfirm: "Publier",
  saved: "Article publié !",
  updated: "Article mis à jour",
  deleted: "Article supprimé",
  titleRequired: "Un titre est obligatoire",
  contentRequired: "Le texte de l'article est obligatoire",
  signIn: "Connectez-vous pour écrire un article.",
  articles: "article(s)",
};

const EN: typeof FR = {
  intro:
    "This is a space for discovery, for the pleasure of writing, for sharing about indie music and indie culture. We're counting on you and your fine pens.",
  subtitle: "Articles written by the community: listeners-readers, artists and media.",
  write: "Write an article",
  empty: "No article yet. Be the first pen!",
  title: "Title",
  excerpt: "Short teaser",
  content: "Your article",
  cover: "Cover image",
  video: "Video link (YouTube / Vimeo, optional)",
  publish: "Publish article",
  update: "Save changes",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Permanently delete this article?",
  byline: "By",
  readMore: "Read the article",
  diffusion: "Distribution",
  onFeed: "Also show a teaser on the Live wall",
  villageOnly: "Only inside RéDaK'Village",
  warnTitle: "Your article will be public",
  warnBody:
    "Anyone can read it and share it on other platforms. You can edit or delete it at any time, but shares already made by third parties (social networks, screenshots, copies) may keep existing elsewhere: that is beyond InDi RaDio's control.",
  warnAck: "I understand",
  warnConfirm: "Publish",
  saved: "Article published!",
  updated: "Article updated",
  deleted: "Article deleted",
  titleRequired: "A title is required",
  contentRequired: "The article text is required",
  signIn: "Sign in to write an article.",
  articles: "article(s)",
};

export function useVillageTxt() {
  const { lang } = useLang();
  return lang === "en" ? EN : FR;
}
