# Titres d'œuvres : protection uniquement vers le français

## Le problème

Aujourd'hui, tout texte entre guillemets est protégé de la traduction **dans les deux sens**. Résultat : une publication écrite en français avec un titre entre guillemets n'est plus correctement traduite vers l'anglais, et globalement les titres de publications restent en français pour les lecteurs anglophones.

## La règle voulue

- **Traduction vers le français (EN → FR)** : le contenu entre guillemets reste tel quel — un titre de chanson ou d'album anglais n'est jamais francisé.
- **Traduction vers l'anglais (FR → EN)** : traduction normale et complète, aucun blocage.
- Lecture en mode FR d'un texte déjà français : rien ne change, aucune traduction n'est déclenchée.

## Ce qui va être fait

1. **Protection conditionnelle** : la mise entre parenthèses des passages guillemetés ne s'applique plus que lorsque la langue cible est le français. Vers l'anglais, le texte est envoyé intégralement au traducteur.
2. **Rafraîchissement du cache** : la clé de cache des traductions est versionnée pour que toutes les traductions vers l'anglais figées par l'ancienne règle soient régénérées automatiquement à la première lecture.
3. **Astuce pour les rédacteurs anglophones** : dans la fenêtre de publication (mur social et actus), un petit encart discret apparaît quand l'interface est en anglais : *"Tip: put song or album titles in quotes — "Song Title" — so they stay in their original language for French readers."* Il est fermable et la fermeture est mémorisée.

## Détails techniques

- `src/lib/translate.server.ts` : `protectQuotedWorks` / `restoreQuotedWorks` appelés uniquement si `target === "fr"` ; consigne système sur les placeholders conservée dans ce cas seulement. `hashText` passe en `quoted-works-v2`.
- Nouveau composant léger `src/components/i18n/QuotedTitlesHint.tsx` (affiché si `lang === "en"`, état masqué en `localStorage`), inséré dans le composer de `src/components/wall/SocialWall.tsx` et celui de `src/routes/actus.index.tsx`.
- Textes ajoutés aux deux dictionnaires dans `src/lib/i18n/dict.ts`.
