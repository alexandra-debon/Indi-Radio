# Plan : flux RSS bilingues FR / EN

## Goal
Ajouter une version anglaise de chaque flux RSS existant, pour pouvoir soumettre à Google Publisher Center et Apple News un flux dédié à la langue anglaise.

## Contexte actuel
- Les flux RSS actuels sont générés en français uniquement (`<language>fr-FR</language>`).
- Les traductions de contenu sont déjà stockées dans `public.content_translations` (clé `entity_type, entity_key, field, lang`).
- 7 flux existants : `/rss.xml`, `/rss-chroniques.xml`, `/rss-actus.xml`, `/rss-clips.xml`, `/rss-magazine.xml`, `/rss-coups-de-coeur.xml`, `/podcast.xml`.

## Proposed changes

### 1. URLs des versions anglaises
Créer une version anglaise de chaque flux, cohérente avec la convention `sitemap-en.xml` déjà utilisée :

| Français | Anglais |
|----------|---------|
| `/rss.xml` | `/rss-en.xml` |
| `/rss-chroniques.xml` | `/rss-chroniques-en.xml` |
| `/rss-actus.xml` | `/rss-actus-en.xml` |
| `/rss-clips.xml` | `/rss-clips-en.xml` |
| `/rss-magazine.xml` | `/rss-magazine-en.xml` |
| `/rss-coups-de-coeur.xml` | `/rss-coups-de-coeur-en.xml` |
| `/podcast.xml` | `/podcast-en.xml` |

### 2. Refonte de `src/lib/rss.ts`
- Ajouter un paramètre `lang` (`fr` | `en`) aux fonctions `renderFeed` et aux loaders de contenu.
- Enrichir `FeedItem` avec les champs `entityType`, `entityKey` et `fieldMap` pour pouvoir récupérer les traductions en base.
- Créer une fonction `translateFeedItems(items, lang)` qui :
  - récupère les traductions déjà en cache dans `content_translations` ;
  - pour les traductions manquantes, appelle la gateway AI (`translateContent` côté serveur) pour les générer et les mettre en cache ;
  - remplace les titres, descriptions et contenus `contentHtml` par leur version anglaise.
- Conserver les artistes non traduits dans les titres composites (ex. `Artist — Title`).

### 3. Nouvelles routes de flux anglais
- Créer les fichiers de route `src/routes/rss-en[.]xml.ts`, `src/routes/rss-chroniques-en[.]xml.ts`, etc.
- Chaque route appelle `renderFeed` avec `lang: "en"`, `language: "en"`, et les titres/descriptions anglais via le dictionnaire existant (`dict.en`).

### 4. Liens alternatifs entre langues
Dans chaque flux (français et anglais), ajouter un `<atom:link rel="alternate" hreflang="..." type="application/rss+xml" />` pointant vers l'autre version.

### 5. Mise à jour de `public/robots.txt`
- Déclarer les 7 nouveaux flux anglais dans la section `Sitemap:` existante (ou via un bloc `Allow` si nécessaire).
- Actualiser la date de dernière mise à jour.

### 6. Tests et validation
- Étendre `tests/rss-feeds.test.ts` pour vérifier les 7 flux anglais (structure, GUID canoniques, dates, namespaces, `atom:link rel="self"`).
- Étendre `tests/rss-platforms.test.ts` pour vérifier la langue anglaise, les métadonnées de chaîne et les images Apple News.
- Mettre à jour `src/routes/rss-test.tsx` pour afficher les 14 flux (FR + EN) et permettre le debug.
- Mettre à jour `scripts/rss-diff.mjs` et `.rss-snapshots/feeds.json` pour inclure les nouveaux flux.
- Vérifier que `publish-verify.mjs` continue de valider les flux FR + EN.

### 7. SEO / soumission
- Soumettre `/rss-en.xml` à Google Publisher Center et Apple News comme flux anglais principal.
- Conserver `/rss.xml` comme flux principal français.

## Technical details
- Le code reste côté serveur : les routes RSS utilisent déjà `server.handlers.GET` de TanStack Router, donc les appels à la gateway AI et à la base admin sont possibles.
- Langue par défaut : si une traduction n'existe pas encore, l'item est traduit à la volée et mis en cache. En cas d'indisponibilité de la gateway, l'item reste en français (fallback non bloquant).
- Les URLs canoniques des items ne changent pas (on reste sur `radio.indi-art-culture.com/chroniques/...` sans `?hl=en`), car les articles eux-mêmes sont déjà bilingues sur le site via le sélecteur de langue.
