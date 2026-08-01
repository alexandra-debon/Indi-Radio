# Flux RSS pour InDi RaDio

## Le principe d'un flux RSS, en clair

Un flux RSS est une page de ton site qui ne contient pas de design, seulement une liste de contenus au format XML : pour chaque élément, un titre, un lien, une date, un résumé, parfois une image ou un fichier audio.

Ce que ça change concrètement :

- **Abonnement** : un lecteur (Feedly, Inoreader, Thunderbird, Substack Reader, Apple Podcasts…) interroge cette adresse toutes les X minutes. Dès qu'un nouvel élément apparaît en haut de la liste, l'abonné le voit sans revenir sur le site.
- **Découverte / indexation** : Google, Bing et de nombreux agrégateurs acceptent un flux comme source de découverte. C'est complémentaire du sitemap : le sitemap dit « voici toutes mes URL », le flux dit « voici les nouveautés, avec le contenu ».
- **Republication** : d'autres sites, newsletters ou apps peuvent afficher automatiquement tes dernières chroniques ou clips.
- **Podcasts** : un flux RSS enrichi (balises iTunes + fichier audio joint) est le format officiel d'Apple Podcasts, Spotify, Deezer, Podcast Index. C'est littéralement ce qu'on soumet pour être listé.

Points à savoir avant de se lancer :

- Le flux est **public** : tout ce qu'on y met est lisible par n'importe qui. On n'y met donc que du contenu déjà public (rien de réservé aux connectés).
- Il est **généré à la demande** depuis la base : aucune maintenance manuelle, chaque publication apparaît automatiquement.
- On y met un **extrait** plutôt que l'article entier, pour que le clic revienne sur le site.
- Un flux ne remplace pas les sitemaps : on garde les deux.

## Ce que je vais créer

Cinq flux, chacun à une adresse dédiée :

| Adresse | Contenu |
|---|---|
| `/rss.xml` | Flux principal : tout le contenu éditorial récent, toutes rubriques confondues |
| `/rss-chroniques.xml` | Chroniques d'albums publiées |
| `/rss-actus.xml` | Actus / Indi Rézo |
| `/rss-clips.xml` | Clips (Clip Addict) |
| `/podcast.xml` | Émissions et épisodes, au format podcast (balises iTunes, fichier audio joint) — soumissible à Apple Podcasts et Spotify |

Chaque élément contiendra : titre, lien canonique, date de publication, auteur, extrait nettoyé du HTML, et l'image de couverture quand elle existe.

## Où les flux seront visibles

- Une icône / lien « S'abonner (RSS) » dans le pied de page, avec les cinq adresses.
- Une balise de découverte automatique dans l'en-tête du site, pour que les navigateurs et lecteurs détectent les flux tout seuls quand on colle l'adresse du site.
- Les adresses des flux ajoutées à `robots.txt` (autorisées explicitement) et référencées depuis la page « À propos ».

## Détails techniques

- Nouveau module `src/lib/rss.ts` : client Supabase publishable en lecture seule (même schéma que `sitemap-entries.ts`), échappement XML, conversion HTML → texte pour les extraits, rendu RSS 2.0 avec `atom:self`, `lastBuildDate`, `<enclosure>` pour l'audio et `media:content` pour les images.
- Les URL des éléments passent par `canonicalUrl()` de `src/lib/canonical.ts`, donc strictement identiques aux canoniques des pages (pas de slash final, pas de paramètre parasite).
- Routes serveur TanStack `src/routes/rss[.]xml.ts`, `rss-chroniques[.]xml.ts`, `rss-actus[.]xml.ts`, `rss-clips[.]xml.ts`, `podcast[.]xml.ts`, sur le même modèle que les sitemaps : en-têtes `Content-Type: application/rss+xml`, `Cache-Control`, `ETag` + `Last-Modified` avec réponse 304 conditionnelle.
- Sources : `album_reviews` (published = true), `news_posts`, `clip_entries`, `shows` + `episodes` (published_at non nul). Limite de 50 éléments par flux, triés du plus récent au plus ancien.
- `<pubDate>` provient de la date réelle de publication de chaque contenu ; aucun repli sur la date du jour.
- Balises `<link rel="alternate" type="application/rss+xml">` ajoutées dans `src/routes/__root.tsx`.
- Le flux podcast ne liste que les épisodes ayant une URL audio directe ; ceux qui pointent vers une plateforme externe sont exclus (une plateforme ne peut pas les rediffuser).
