# Éditeur SEO par page et par article (façon Wix)

Objectif : pouvoir choisir moi-même, depuis le panneau admin, le titre, la description, l'image d'aperçu et l'indexation de **chaque page** et de **chaque article**, en français et en anglais — sans passer par le code.

Aujourd'hui ces textes sont écrits en dur dans le code (`seo-meta.ts`) : impossible de les modifier depuis l'application. On les rend éditables.

## 1. Nouvel onglet « SEO » dans le panneau admin

Liste de toutes les pages du site (Accueil, À propos, Actus, Podcasts, Émissions, Chroniques, Magazines, Clip Addict, Chart, Top, Top utilisateurs, Artistes, Coups de cœur, Dédicaces, Contact, Soumission artistes, Newsletter, Confidentialité, CGU…) avec, pour chacune :

- un indicateur « personnalisé » ou « par défaut »
- un bouton « Modifier le SEO »

Un moteur de recherche/filtre en haut, et un second onglet « Articles » listant les contenus dynamiques (actus, chroniques, coups de cœur, magazines, clips, podcasts, émissions, épisodes) avec le même bouton.

## 2. Le formulaire d'édition SEO (identique partout)

Pour chaque page ou article, en **FR** et en **EN** :

- **Titre SEO** — compteur de caractères, alerte au-delà de 60
- **Description SEO** — compteur, alerte au-delà de 160
- **Image d'aperçu (og:image)** — upload ou URL, c'est l'image affichée sur Facebook / LinkedIn / WhatsApp
- **URL canonique** — laissée automatique par défaut, modifiable
- **Indexation Google** — interrupteur « Afficher cette page dans les moteurs de recherche » (met un `noindex` si désactivé)
- **Mots-clés** (optionnel, indicatif)

Avec :
- un **aperçu Google en direct** (comme sur Wix : le rendu du résultat de recherche se met à jour pendant la saisie)
- un **aperçu réseau social** (carte Facebook/LinkedIn)
- un bouton **« Réinitialiser »** pour revenir au texte par défaut
- des **suggestions automatiques** si le champ est vide (titre de l'article + « InDi RaDio 24/7 de la musique indépendante »)
- enregistrement automatique du brouillon comme pour les Coups de cœur

## 3. Édition directe depuis chaque éditeur de contenu

Dans les formulaires existants (nouvelle actu, chronique, coup de cœur, magazine, clip…), un bloc repliable **« Réglages SEO »** reprend le même formulaire, pour renseigner le SEO au moment de la publication sans aller dans l'onglet SEO.

## 4. Prise en compte réelle par Google

- Les valeurs personnalisées remplacent les valeurs par défaut dans le HTML servi (titre, description, og:*, twitter:*, canonique, noindex), donc visibles par Google et par les aperçus de partage.
- Les pages passées en « non indexées » sont automatiquement retirées du sitemap.
- Après enregistrement, un ping IndexNow (déjà en place) signale la modification aux moteurs, et un bouton « Demander l'indexation » est proposé.

## 5. Lien avec Google Search Console (optionnel, 2e étape)

Le compte Google Search Console est déjà connecté au projet. Si tu le souhaites, on ajoute ensuite dans ce même onglet : état d'indexation de chaque URL, clics/impressions/position, et soumission des sitemaps. Je le propose en deuxième temps pour livrer d'abord l'éditeur SEO, qui est ce que tu demandes.

## Détails techniques

- Nouvelle table `seo_overrides` : `path` (ou `entity_type` + `entity_id`), `lang`, `title`, `description`, `og_image_url`, `canonical_url`, `noindex`, `keywords`, timestamps. Lecture publique (`anon`/`authenticated` en SELECT), écriture réservée aux admins via `has_role(auth.uid(), 'admin')`, plus les GRANT correspondants.
- `resolveSeo()` dans `src/lib/i18n/seo-meta.ts` devient : override en base → valeur par défaut du code → valeur générique. Les overrides sont chargés côté serveur (server function publique en lecture) et injectés dans le `head()` des routes ; `SeoLocalizer` utilise la même source côté client au changement de langue.
- Nouvelle route `src/routes/_authenticated/admin.seo.tsx` (noindex, admin uniquement) + carte et onglet « SEO » dans `admin.tsx`, sur le modèle de « Diffuseurs ». La page existante `/admin/seo-preview` reste accessible pour la comparaison FR/EN.
- Server functions admin dans `src/lib/seo-overrides.functions.ts` : lecture, écriture, suppression, avec vérification du rôle admin.
- `sitemap-entries.ts` filtre les chemins marqués `noindex`.
