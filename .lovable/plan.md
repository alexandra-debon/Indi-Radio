## Objectif
Sur la page « En direct », remplacer le mur social complet par une **fenêtre compacte** montrant seulement les 3 dernières publications (avec l'épinglée « à la une » en priorité si elle existe). Un bouton flèche permet de **déployer** le mur en vue complète (plein écran interne) et de **rétracter** avec la même flèche inversée.

## UX proposée

### Mode compact (par défaut)
- Cadre `card-brut` intitulé « Mur en direct » avec compteur de posts.
- À droite du header : bouton **« Publier »** (existant) + bouton flèche **⤢ / ChevronsUpDown** « Déployer ».
- Contenu : **3 posts maximum**
  - Si un post est épinglé (« à la une ») → il occupe le 1er slot, puis les 2 derniers non épinglés.
  - Sinon → les 3 derniers posts chronologiques.
- Chaque post en version condensée : auteur, titre/extrait (2-3 lignes max, `line-clamp-3`), 1ère image si présente (miniature), compteurs (likes/commentaires). Pas de fil de commentaires déployé, pas de composer inline.
- Cliquer sur un post → déploie le mur ET scrolle sur ce post (via `openThread`).
- Un lien discret « Voir tout le mur → » sous les 3 cartes déclenche aussi le déploiement.

### Mode déployé (plein écran interne)
- Le mur social complet actuel (avec filtres hashtag, tous les posts, composer via Sheet, réponses, etc.) prend toute la largeur/hauteur utile.
- Position : `fixed inset-0 z-40` avec fond de la page, header sticky affichant le titre + bouton **flèche inversée « Rétracter »** (icône `ChevronsDownUp` / `Minimize2`).
- Le MiniPlayer reste visible en bas (z-index préservé).
- Fermeture aussi via touche `Escape` et bouton retour navigateur (push d'un state d'historique).
- Scroll interne indépendant.

### État & mémorisation
- État `wallExpanded` local (React state), non persisté — chaque visite démarre en mode compact pour ne pas gêner la navigation.
- Si on arrive avec un hash `#post-xxx` (notification), déploiement automatique.

## Fichiers touchés
- `src/routes/index.tsx` : remplacer `<SocialWall />` par un nouveau `<SocialWallPanel />` qui gère compact/déployé.
- `src/components/wall/SocialWallPanel.tsx` (nouveau) : wrapper qui rend soit `WallCompact` soit `SocialWall` en overlay plein écran, avec bouton flèche.
- `src/components/wall/WallCompact.tsx` (nouveau) : vue condensée 3 posts (query dédiée limitée, avatar+titre+extrait+miniature+compteurs).
- `src/components/wall/SocialWall.tsx` : accepter une prop optionnelle `onCollapse?: () => void` pour afficher le bouton « Rétracter » dans son header quand utilisé en mode déployé. Pas de changement de logique métier.
- `src/lib/i18n/dict.ts` : ajouter `wall.expand`, `wall.collapse`, `wall.seeAll`, `wall.compactTitle` (FR/EN).
- `src/components/onboarding/OnboardingTour.tsx` : vérifier que la cible `data-tour="social-wall"` pointe sur le panneau compact et que l'étape reste lisible.

## Hors scope
- Aucune modif back-end / RLS / DB.
- Pas de changement sur `/actus`.
- Pas de changement sur la logique de posts, likes, commentaires, notifications, composer.
- Aucun changement visuel du mur en mode déployé (identique à l'actuel).

## Détails techniques
- La vue compacte fait sa propre requête légère (`select id,title,content,image_urls,author_id,created_at,is_pinned + counts` limitée à 4 pour pouvoir prendre 1 épinglé + 3 récents, puis slicer côté client à 3).
- Overlay plein écran : `motion.div` avec transition `slide/fade` rapide (200ms).
- Accessibilité : `aria-expanded` sur le bouton flèche, focus trap dans l'overlay, `Escape` pour fermer.
