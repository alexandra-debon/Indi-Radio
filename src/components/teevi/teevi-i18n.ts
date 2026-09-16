import { useLang } from "@/lib/i18n";

const FR = {
  title: "InDi TeeVi",
  intro:
    "La partie gratuite de la chaîne vidéo InDi RaDio : des vidéos indépendantes, en accès libre.",
  empty: "Aucune vidéo pour l'instant.",
  add: "Nouvelle vidéo",
  edit: "Modifier",
  remove: "Supprimer",
  confirmDelete: "Supprimer cette vidéo ?",
  formTitle: "Titre de la vidéo",
  formVideo: "Lien Vimeo",
  formSummary: "Résumé (optionnel)",
  formTags: "Tags (séparés par des virgules)",
  formTagsHint: "ex. live, interview, documentaire",
  formImage: "Vignette de partage (paysage 1200×630 — générée automatiquement si vide)",
  published: "Publiée",
  save: "Enregistrer",
  cancel: "Annuler",
  saved: "Enregistré",
  deleted: "Vidéo supprimée",
  titleRequired: "Un titre est obligatoire.",
  videoRequired: "Un lien Vimeo valide est obligatoire.",
  back: "Retour à InDi TeeVi",
  notFound: "Cette vidéo n'existe pas ou a été retirée.",
  comments: "Commentaires",
  commentPlaceholder: "Votre commentaire…",
  commentPublish: "Publier",
  commentEmpty: "Aucun commentaire pour l'instant.",
  commentSignIn: "Connectez-vous pour commenter.",
  commentDelete: "Supprimer",
  commentEdit: "Modifier",
  like: "J'aime",
  unlike: "Retirer le j'aime",
  draft: "Brouillon",
};

const EN: typeof FR = {
  title: "InDi TeeVi",
  intro: "The free side of the InDi RaDio video channel: independent videos, open access.",
  empty: "No video yet.",
  add: "New video",
  edit: "Edit",
  remove: "Delete",
  confirmDelete: "Delete this video?",
  formTitle: "Video title",
  formVideo: "Vimeo link",
  formSummary: "Summary (optional)",
  formTags: "Tags (comma separated)",
  formTagsHint: "e.g. live, interview, documentary",
  formImage: "Share thumbnail (landscape 1200×630 — auto-generated if empty)",
  published: "Published",
  save: "Save",
  cancel: "Cancel",
  saved: "Saved",
  deleted: "Video deleted",
  titleRequired: "A title is required.",
  videoRequired: "A valid Vimeo link is required.",
  back: "Back to InDi TeeVi",
  notFound: "This video does not exist or was removed.",
  comments: "Comments",
  commentPlaceholder: "Your comment…",
  commentPublish: "Post",
  commentEmpty: "No comment yet.",
  commentSignIn: "Sign in to comment.",
  commentDelete: "Delete",
  commentEdit: "Edit",
  like: "Like",
  unlike: "Remove like",
  draft: "Draft",
};

export function useTeeviTxt() {
  const { lang } = useLang();
  return lang === "en" ? EN : FR;
}

export interface TeeviVideo {
  id: string;
  title: string;
  video_url: string;
  summary: string | null;
  tags: string[] | null;
  og_image_url: string | null;
  published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}
