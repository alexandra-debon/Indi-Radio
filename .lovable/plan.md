# Suivi Search Console : soumission fr/en, inspection d'URLs, performances

## Contexte vérifié aujourd'hui

- Propriété Search Console : `https://radio.indi-art-culture.com/` (accès propriétaire).
- `/sitemap.xml` (index) : soumis le 27/07, lu le 31/07 — 0 erreur, 0 avertissement, 115 URLs web + 12 images + 3 vidéos.
- `/sitemap-fr.xml` : découvert via l'index, lu le 02/08 à 10:45 — 43 URLs, 0 erreur.
- `/sitemap-en.xml` : découvert via l'index, lu le 02/08 à 01:51 — 43 URLs, 0 erreur.
- Page d'accueil : « Submitted and indexed », robots.txt autorisé, canonique Google = canonique déclarée, dernier crawl 02/08 en mobile.

Aucun problème bloquant. Les trois actions ci-dessous sont du suivi, pas des corrections.

## 1. Soumettre explicitement les sitemaps FR et EN

Déclarer `/sitemap-fr.xml` et `/sitemap-en.xml` comme sitemaps à part entière dans Search Console, en plus de l'index. Effet : chacun apparaît comme une ligne distincte dans le rapport Sitemaps, avec son propre historique de lecture et ses erreurs par langue. L'index reste en place, rien n'est retiré.

## 2. Inspecter les URLs clés

Contrôle un par un de l'état d'indexation (verdict, canonique, dernier crawl, robots) des pages publiques principales :

```text
/                      /magazine
/chroniques            /coups-de-coeur
/actus                 /clips
/playlists             /artistes
/emissions             /a-propos
```

Plus un échantillon en anglais (`?hl=en`) pour confirmer que la version EN est bien indexée séparément et que le hreflang n'entraîne pas de canonique croisée.

Résultat : un tableau récapitulatif indiquant pour chaque URL le verdict, l'état de couverture, la canonique retenue par Google et la date du dernier crawl, avec la liste des pages non encore indexées.

## 3. Rapport de performances (28 derniers jours)

Extraction des clics, impressions, CTR et position moyenne :
- par page (top 25),
- par requête (top 25),
- par pays, pour vérifier la répartition France / international,
- comparaison FR vs EN via le filtre d'URL.

Résultat : synthèse chiffrée + lecture des points à travailler (pages en position 11-20 à pousser, requêtes avec impressions mais peu de clics).

## Détails techniques

- Tout passe par le connecteur Google Search Console déjà relié au projet (`webmasters/v3` pour les sitemaps et `searchAnalytics/query`, `v1/urlInspection` pour l'inspection).
- La soumission des sitemaps est un `PUT` sur la propriété vérifiée — la seule action non lecture seule du lot.
- Aucune modification du code de l'application n'est nécessaire : les sitemaps, hreflang et canoniques sont déjà en place et validés.
