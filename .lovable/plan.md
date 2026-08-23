# Remplacer le logo carré InDi RaDio par la version modernisée

## Ce qui change

Le nouveau visuel carré (personnage jaune au micro + casque + lettrage "InDi RaDio") remplace le logo carré actuel partout où il apparaît, aux mêmes dimensions et proportions qu'aujourd'hui — aucun changement de taille ni de mise en page.

Emplacements concernés :
- Icône dans la barre d'en-tête (à côté du wordmark)
- Icône dans le pied de page
- Pochette par défaut du lecteur radio (affichage Bluetooth / écran verrouillé / Media Session)
- Dialogues et écrans qui réutilisent ce même logo

Le wordmark texte "InDi RaDio" de l'en-tête reste inchangé (c'est une image séparée).

## Mise en avant sur les moteurs de recherche

Le logo est déjà référencé dans le balisage Organization (schema.org) et les icônes du site. Une fois le nouveau visuel en place, ces références pointeront vers la version modernisée. Quand tu enverras les autres formats (icône 1024×1024, image de partage 1200×630, favicon), je les brancherai sur :
- les icônes PWA / écran d'accueil (192, 512, maskable)
- l'apple-touch-icon et le favicon
- le `logo` du balisage Organization
- l'image d'aperçu de partage (og:image / twitter:image)

## Détails techniques

- Upload du fichier fourni via le CDN d'assets (`lovable-assets create`) et remplacement du pointeur `src/assets/indi-radio-logo.png.asset.json` par le nouveau pointeur, afin que tous les imports existants (`AppShell.tsx`, `__root.tsx`, `RadioPlayerProvider.tsx`) reprennent automatiquement le nouveau visuel sans changer une seule classe CSS.
- Vérification visuelle en préview (en-tête mobile + desktop, pied de page) après remplacement.
