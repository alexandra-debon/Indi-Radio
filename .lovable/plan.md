# RéDaK'Village + teasers sur le mur « En direct »

## 1. RéDaK'Village : le coin des plumes de la communauté

Nouvel espace public, séparé du blog éditorial `/actus`, réservé aux articles
écrits par les membres (Auditeurs-Lecteurs, Artistes, Médias).

- Nouvelle page **`/redak-village`** : bloc d'intro en haut avec le texte exact
  demandé, puis la liste des articles publiés (image, titre, accroche, auteur,
  date, catégorie Musique / Livre / Art).
- Nouvelle page article **`/redak-village/<adresse-de-l-article>`** : article
  complet, image ou vidéo, auteur cliquable, bouton Partager, j'aime et
  commentaires (mêmes fonctions que le mur).
- **Écriture** : bouton « Écrire un article » accessible à tout membre connecté,
  avec titre, accroche, texte, image de couverture, vidéo facultative,
  catégorie et choix de diffusion (visible aussi sur le mur « En direct », ou
  seulement dans RéDaK'Village).
- **Modifier / supprimer** : toujours possible pour l'auteur, depuis la page de
  l'article et depuis son espace personnel.
- L'équipe InDi garde `/actus` inchangé.

## 2. Avertissement au moment de publier

À la publication (et rappelé à chaque modification), une fenêtre indique que
l'article est public, qu'il peut être partagé hors de la plateforme, et que des
partages déjà effectués par des tiers peuvent subsister même après modification
ou suppression. Case « J'ai compris » obligatoire la première fois, mémorisée
ensuite ; le texte reste visible sous le formulaire.

## 3. Partage : vraie miniature sur les réseaux

Chaque article RéDaK'Village reçoit ses propres balises de partage (titre,
accroche, image de l'article ou visuel par défaut), sur le même modèle que les
articles `/actus` : traduction FR/EN, adresse canonique, fiche structurée
Article, et l'article est ajouté au plan du site.

## 4. Teasers cliquables sur le mur court « En direct »

Le mur court de l'accueil mélange désormais, par date :

- les publications du mur (comme aujourd'hui) ;
- les articles RéDaK'Village diffusés sur le mur ;
- les nouveautés de `/actus` (Blog InDi ArT CulTuRe) ;
- les nouveautés de `/clips` (Clip Addict) ;
- les nouvelles chroniques d'albums `/chroniques`.

Chaque teaser : petite étiquette de provenance bien visible (RéDaK'Village,
Blog, Clip Addict, Chronique), vignette, titre, accroche courte (jamais le texte
complet), auteur — pseudo du membre pour RéDaK'Village, mention de l'équipe
InDi RaDio pour les trois contenus éditoriaux (aucun changement sur qui a le
droit d'y publier). Un clic ouvre la page complète correspondante.

## 5. Audit « l'auteur reste maître de son contenu »

Vérification de tous les contenus créés par un membre, côté base et côté écran.
Les droits en base sont corrects ; les manques repérés à l'écran seront comblés :

- objets de boutique : ajout de la modification (titre, format, photo,
  présentation, lien d'achat) — aujourd'hui seulement ajout/suppression ;
- réponses et commentaires (mur, page artiste, contenus éditoriaux) : ajout du
  bouton « Modifier » pour l'auteur ;
- vérification des publications du mur, blog artiste, albums photo, dates de
  concert, articles RéDaK'Village : modification + suppression disponibles.

Résultat attendu : partout, l'auteur peut modifier et supprimer son propre
contenu, sans blocage.

## Détails techniques

- Migration : table `village_articles` (`id`, `author_id`, `title`, `slug`
  unique, `excerpt`, `content`, `cover_url`, `video_url`, `category` CHECK
  musique/livre/art, `visibility` CHECK feed/village_only, `published`,
  `created_at`, `updated_at`), trigger de slug + `updated_at`, GRANT
  anon SELECT / authenticated CRUD / service_role ALL, RLS : lecture publique si
  `published`, écriture réservée à l'auteur (ou admin).
- Likes/commentaires réutilisent `content_likes` / `content_comments` avec
  `content_type = 'village_article'` (déjà en place pour d'autres contenus).
- Routes : `src/routes/redak-village.index.tsx`, `redak-village.$slug.tsx`,
  `redak-village.nouveau.tsx` (protégée), éditeur partagé dans
  `src/components/village/`.
- `head()` par article via `localizedOgText` + `ogImageTags` comme
  `actus.$postId.tsx` ; `localizedStaticMeta("/redak-village", …)` pour l'index,
  entrée ajoutée dans `STATIC_SEO` et dans les sitemaps FR/EN.
- `WallCompact.tsx` : requêtes parallèles (posts, village_articles,
  news_posts, clip_entries, album_reviews), fusion + tri par date, limite ~6,
  rendu en carte `FeedTeaser` avec `<Link>` typé.
- Typecheck `bunx tsgo --noEmit` et vérification Playwright accueil + article.

## Hypothèses

- Pas de validation admin avant publication : l'article est en ligne
  immédiatement (la modération reste possible via le signalement et l'admin).
- Réservé aux membres connectés ; pas de limite de nombre d'articles.
