# Sitemaps par langue : passage en fr-FR / en (x-default)

## Situation actuelle (vérifiée)

Les sitemaps séparés par langue existent déjà et sont déclarés :

- `/sitemap.xml` (index) référence `sitemap-fr.xml`, `sitemap-en.xml`, `sitemap-users.xml`, `sitemap-images.xml`, `sitemap-video.xml`
- `public/robots.txt` liste bien ces six sitemaps
- Chaque URL des sitemaps FR/EN porte déjà ses `xhtml:link` alternates

Il ne manque donc pas de sitemap : ce qui manque, c'est le ciblage
**régional** demandé (fr-FR pour la France, en pour le reste du monde),
aujourd'hui les alternates sont génériques `fr` / `en`.

## Ce qui sera fait

1. **Codes hreflang régionaux** — les alternates deviennent :
   - `fr-FR` → URL nue (version française, ciblage France)
   - `fr` → même URL (repli francophone : Belgique, Suisse, Canada…)
   - `en` → `?hl=en` (anglais international, « en-XX »)
   - `x-default` → URL nue
2. **Cohérence des pages** — les balises `<link rel="alternate">` injectées
   dans le `<head>` par le localizateur SEO utiliseront exactement les mêmes
   codes que les sitemaps (Google exige la réciprocité stricte).
3. **Index de sitemaps enrichi** — ajout de `<lastmod>` par sitemap enfant,
   calculé à partir du contenu réel, pour que Google et Bing sachent quel
   sitemap de langue recrawler en priorité.
4. **Sitemaps profils / images / vidéos** — vérification qu'ils restent
   mono-langue (URLs canoniques nues) et ne dupliquent pas les entrées FR/EN.
5. **Ping de réindexation** — envoi IndexNow sur les URLs de sitemaps après
   publication pour accélérer le recrawl.

## Détails techniques

- `src/lib/sitemap-entries.ts` : `renderLocalizedSitemap()` émettra les quatre
  alternates (`fr-FR`, `fr`, `en`, `x-default`) ; `renderSitemapIndex()`
  acceptera un `lastmod` par entrée.
- `src/components/i18n/SeoLocalizer.tsx` : alignement des `hreflang` du `<head>`
  sur les mêmes codes, en s'appuyant sur `hreflangUrls()` de `src/lib/canonical.ts`
  (étendu pour renvoyer `frFR`).
- Aucun changement d'URL : la canonique reste l'apex sans slash final, l'anglais
  reste `?hl=en`. Aucune migration de mécanisme de sitemap.
