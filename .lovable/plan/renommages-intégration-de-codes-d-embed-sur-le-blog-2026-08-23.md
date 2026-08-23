# Renommages + intégration de codes d'embed sur le Blog

## 1. Renommages (aucun changement de contenu ni d'URL)

- Page d'accueil « En direct » : le bandeau jaune **« Mur en direct »** devient **« InDi ReZo en Direct »** (et « Live wall » -> « InDi ReZo Live » en anglais).
- Menu, entrée n°2 : **« Actus · Indi Rézo »** devient **« Blog InDi ArT CulTuRe »** (identique en anglais).
- Le titre affiché en haut de la page `/actus` et son sous-titre sont alignés sur le nouveau nom.
- L'URL `/actus` reste inchangée : aucun lien, aucun partage, aucun flux RSS ne casse.

## 2. SEO à rafraîchir pour la page Blog

- Titre, description, `og:title`/`og:description`, `twitter:*` de `/actus` réécrits autour de « Blog InDi ArT CulTuRe » (FR et EN), en gardant les mots-clés radio/musique indépendante.
- Données structurées : le `Blog` schema.org prend le nouveau nom, ainsi que le fil d'Ariane.
- Le libellé SEO de l'entrée de menu et l'entrée correspondante dans les sitemaps sont mis à jour, puis les moteurs sont notifiés (ping sitemaps + IndexNow) pour re-crawler la page.

## 3. Articles par code d'intégration (Gamma & autres)

Objectif : pouvoir soit rédiger manuellement comme aujourd'hui, soit coller un code d'intégration, soit les deux dans un même article, avec toujours la barre de liens réseaux sociaux / plateformes / site web.

- Nouveau champ optionnel dans le formulaire de publication (admin/animateur) : « Code d'intégration ». On peut y coller un `<iframe ...>` complet ou juste l'URL d'embed.
- Le collage est analysé : on en extrait l'adresse de la source et le ratio/hauteur si présents. Seules les sources de plateformes reconnues sont acceptées (Gamma, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Canva, Substack, Deezer, Apple Music, FlipHTML5, Google Docs/Slides…). Tout script ou HTML arbitraire est refusé, avec un message clair indiquant les plateformes acceptées.
- Aperçu immédiat sous le formulaire avant publication.
- L'affichage de l'article rend l'intégration en cadre responsive, sous le texte et au-dessus des images, avec un rendu adapté au mobile.
- Le champ est aussi disponible en édition d'un article existant (ajout, remplacement, suppression).
- Rien d'obligatoire : un article peut n'avoir que du texte, que l'intégration, ou les deux ; la barre de liens sociaux reste identique et disponible dans tous les cas.

## Détails techniques

- Libellés : `nav.news` et `wall.compactTitle` dans `src/lib/i18n/dict.ts` (FR + EN), plus `page.actus.title` / `page.actus.subtitle` et le champ `seo` du menu dans `src/components/AppShell.tsx`.
- Métadonnées : `head()` de `src/routes/actus.index.tsx` (+ `src/routes/actus.$postId.tsx` si le nom du blog y apparaît), `src/lib/i18n/seo-meta.ts` pour la version localisée, `src/lib/sitemap-entries.ts` pour le `lastmod` de `/actus`.
- Base : migration ajoutant `embed_url text` et `embed_height int` (nullable) sur `public.news_posts` ; les politiques RLS et GRANT existants couvrent déjà ces colonnes, aucune nouvelle policy nécessaire.
- Sanitisation : nouveau module type `src/lib/embed-code.ts` qui parse le code collé, extrait `src`, vérifie l'hôte contre une liste blanche et renvoie une URL normalisée ; aucun HTML brut n'est stocké ni injecté.
- Rendu : composant `EmbedFrame` (iframe `sandbox="allow-scripts allow-same-origin allow-popups"`, `loading="lazy"`, `referrerpolicy="no-referrer"`) utilisé dans `NewsCard` et dans l'aperçu du formulaire.
