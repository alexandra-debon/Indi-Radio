Le bouton actuel (icône `Maximize2` dans un bouton outline) n’est pas suffisamment explicite. On le remplace par un handle visuel jaune et directionnel, clairement séparé du bouton "Publier".

## Proposition recommandée (Option 1)

Un **handle jaune** fixé au-dessus du bloc compact et répété en haut de l’overlay plein écran :

- Compact : barre arrondie jaune (`bg-primary text-primary-foreground`) centrée au-dessus du mur, avec le texte "Déployer le mur" et une **flèche vers le bas** (`ChevronDown`).
- Déployé : même barre jaune en haut de l’overlay plein écran, avec le texte "Rétracter le mur" et une **flèche vers le haut** (`ChevronUp`).
- La flèche a une micro-animation continue (bounce/flottement) pour indiquer l’action possible.
- Le swipe haut/bas reste fonctionnel, mais le handle donne un repère visuel clair aux utilisateurs qui ne swipent pas.

## Alternatives possibles

**Option 2** : bouton jaune flottant en bas à droite du bloc compact, avec flèche vers le bas. En mode déployé, la flèche passe en haut à droite avec une barre sticky.

**Option 3** : la barre de titre du bloc "Mur en direct" devient entièrement jaune et cliquable, avec une flèche à droite qui pivote selon l’état.

## Implémentation technique

1. Créer un composant `WallExpandHandle` dans `src/components/wall/` :
   - Props : `expanded`, `onClick`, `label`, `iconDirection`.
   - Style : `bg-primary text-primary-foreground`, `border-2 border-black`, `shadow-[2px_2px_0_0_#000]`, `rounded-full` ou `rounded-xl`.
   - Animation de la flèche avec `animate-bounce` ou une animation CSS custom.

2. Modifier `WallCompact.tsx` :
   - Remplacer le bouton outline `Maximize2` par le handle jaune `ChevronDown`.
   - Conserver le bouton "Publier" à sa place actuelle.
   - Supprimer le bouton "Voir tout le mur" en bas du bloc (redondant avec le handle) ou le garder en option texte secondaire.

3. Modifier `SocialWall.tsx` (ou `SocialWallPanel.tsx`) pour le haut de l’overlay déployé :
   - Ajouter une barre jaune sticky en haut avec `ChevronUp` + "Rétracter le mur".
   - Elle sert de zone de repli cliquable, en complément du swipe vers le bas.

4. Adapter les traductions dans `src/lib/i18n/dict.ts` :
   - `wall.expand` → "Déployer le mur"
   - `wall.collapse` → "Rétracter le mur"
   - Ajouter si besoin `wall.expandHint` / `wall.collapseHint` pour l’accessibilité.

5. Préserver le comportement existant :
   - `Escape` pour fermer.
   - Swipe haut/bas avec feedback visuel.
   - Sauvegarde/restauration du scroll.

6. Vérification responsive sur mobile (iPhone SE/13) et desktop via Playwright.

Quelle option préfères-tu ? Je recommande l’**Option 1** (handle jaune dédié au-dessus du bloc) pour la lisibilité immédiate.