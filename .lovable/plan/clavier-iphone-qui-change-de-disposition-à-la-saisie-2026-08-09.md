# Clavier iPhone qui change de disposition à la saisie

## Diagnostic

Cause confirmée par lecture du code : l'application change dynamiquement la langue déclarée du document.
`src/lib/i18n/index.tsx` (l.67 et l.82) écrit `document.documentElement.lang = "fr" | "en"` à chaque
changement de langue, et le HTML servi part de `lang="fr"` (`src/routes/__root.tsx` l.269).

Sur iOS, quand plusieurs claviers sont installés (Français AZERTY + English QWERTY, ce qui explique
« ça ne le fait pas avec tout le monde »), iOS choisit automatiquement la disposition du clavier à partir
de la langue déclarée du champ / du document. Résultat : un utilisateur en interface EN qui écrit en
français voit son clavier basculer en QWERTY, et la bascule peut se reproduire en cours de frappe quand
la langue est resynchronisée depuis le profil ou depuis le paramètre `?hl=`.

Aucun champ de saisie de l'app (commentaires, mur social, chroniques, chat) ne déclare de `lang`
explicite : ils héritent tous de `<html lang>`.

Hypothèse secondaire à vérifier pendant l'implémentation : la zone de saisie des mentions
(`MentionTextarea`) réécrit la valeur via le setter natif + `dispatchEvent('input')` lors de l'insertion
d'une mention/hashtag, ce qui peut faire réinitialiser la session de saisie (et donc le clavier) sur iOS.

## Ce qui sera fait

1. Découpler la langue d'écriture de la langue d'interface : les champs de saisie libre déclarent une
  langue stable pour le clavier, indépendante du choix FR/EN de l'interface.
2. Appliquer cela de façon centralisée aux composants d'entrée partagés (Textarea, Input,
  `MentionTextarea`, `RichTextArea`), pour couvrir automatiquement les futurs formulaires.
3. Stabiliser les attributs de saisie iOS sur ces champs (`autocapitalize`, `autocorrect`,
  `spellcheck`, `inputmode`) pour qu'ils ne varient pas d'un rendu à l'autre.
4. Vérifier que l'insertion d'une mention/hashtag ne provoque pas de perte de focus ni de
  réinitialisation du clavier, et corriger si c'est le cas.

Les champs à sémantique fixe (email, URL) gardent leur comportement actuel.

## Détails techniques

- Ajouter un attribut `lang` explicite sur les champs de texte libre, avec une valeur qui ne suit pas
`document.documentElement.lang`. Deux options possibles, à trancher : `lang="fr"` fixe, ou une
préférence de langue de saisie mémorisée par utilisateur.
- Centraliser dans `src/components/ui/textarea.tsx` / `input.tsx` (valeur par défaut surchargeable
par prop) plutôt que champ par champ.
- Conserver `document.documentElement.lang` dynamique : il reste nécessaire au SEO et au hreflang.
- Vérification manuelle sur iPhone avec claviers FR + EN installés : ouvrir un commentaire en interface
EN et confirmer que la disposition reste AZERTY, avant et après insertion d'une mention.

&nbsp;

Je veux simplement que mon clavier d'usage reste le même 