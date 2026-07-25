# Mur social épuré — flux d'abord, composer à la demande

## Objectif
Sur la page « En direct », le mur social devient un **flux propre et scrollable**. Le formulaire de publication n'est plus toujours visible : il s'ouvre dans une **fenêtre modale** via un bouton « Publier » (ou automatiquement quand on clique « Répondre » sur un post/commentaire).

## UX proposée

### 1. En-tête du mur (sticky, fin)
- Titre « Mur en direct » + compteur de posts.
- À droite : bouton principal **« ✏️ Publier »** (jaune, style brutaliste cohérent avec l'app).
  - Si non connecté : le bouton ouvre la modale d'auth avec le message existant.
- Petit filtre `#hashtag` actif reste affiché ici (avec croix pour retirer).

### 2. Flux (toujours visible)
- Liste actuelle des posts, inchangée visuellement (cartes, épinglés en haut, commentaires en accordéon).
- Chaque post/commentaire gagne un bouton **« Répondre »** clair (icône + label) qui ouvre la même modale, pré-remplie et scopée à ce post/commentaire.

### 3. Composer en modale (Sheet/Dialog)
- Utilise `Sheet` de shadcn (glisse depuis le bas sur mobile, latéral desktop) — plus intuitif qu'un Dialog centré pour un formulaire long.
- Contenu = le formulaire actuel du SocialWall, tel quel (titre optionnel, MentionTextarea, lien vidéo, uploader multi-images, liens sociaux pour admin/artistes, emoji, hashtags suggérés).
- Trois modes :
  - **Nouveau post** : composer vide.
  - **Réponse à un post** : header « Réponse à @pseudo », publie comme commentaire de premier niveau.
  - **Réponse à un commentaire** : header « Réponse à @pseudo », publie dans le thread avec préfixe `@pseudo`.
- Boutons : `Annuler` / `Publier`. Fermeture auto après succès + toast + scroll vers le nouveau contenu.
- État du brouillon conservé pendant la session (perte évitée si on ferme accidentellement).

### 4. Détails visuels
- Bouton « Publier » flottant discret aussi en bas à droite sur mobile (FAB jaune, `bottom-24` pour ne pas cacher le MiniPlayer) — accès rapide quand on scrolle loin.
- Placeholder du flux vide inchangé.
- Le tour d'onboarding est mis à jour pour pointer sur le nouveau bouton « Publier » au lieu du formulaire inline.

## Fichiers touchés
- `src/components/wall/SocialWall.tsx` : extraire le formulaire actuel en composant `WallComposer`, retirer son rendu inline, ajouter `WallHeader` + `Sheet` + FAB, propager `openThread` → mode réponse.
- `src/components/onboarding/OnboardingTour.tsx` : cibler `[data-tour="wall-publish"]` (le nouveau bouton) au lieu du composer inline.
- `src/lib/i18n/dict.ts` : ajouter `wall.openComposer`, `wall.replyTo`, `wall.newPost`, `wall.cancel` (FR/EN).
- Aucune modification back-end / RLS / DB.

## Hors scope
- Pas de changement sur `/actus` (même si le composer y a été aligné, on peut y appliquer le même pattern ensuite si tu valides celui-ci).
- Pas de changement sur la logique de posts, commentaires, likes, notifications.

## Question rapide avant build
Un point à confirmer : **veux-tu aussi le petit FAB flottant** (bouton « + » jaune en bas à droite) en plus du bouton « Publier » dans l'en-tête du mur, ou uniquement le bouton en en-tête ? Je pars sur les deux par défaut, dis-moi si tu préfères un seul.
