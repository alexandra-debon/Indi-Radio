# Référencement : français en France, anglais à l'étranger

## Ce qui se passe aujourd'hui

Le HTML envoyé par le serveur est bien en français. Mais une fois la page chargée, le composant qui gère la langue regarde la langue du **navigateur** et réécrit dans la foulée le titre, la description, les balises de partage **et l'URL canonique**.

Le robot de Google explore le site avec un navigateur configuré en `en-US`, même pour Google France. Résultat : il voit la page basculer en anglais et il lit une canonique `...?hl=en`. Il indexe donc la version anglaise à la place de la version française — exactement le symptôme constaté.

## Le principe retenu

La langue du **contenu indexé** doit dépendre de l'**URL**, jamais du navigateur :

```text
https://radio.indi-art-culture.com/xxx          -> toujours FRANÇAIS (titre, description, og, canonique)
https://radio.indi-art-culture.com/xxx?hl=en    -> toujours ANGLAIS
```

L'interface, elle, peut continuer à s'afficher automatiquement en anglais pour un visiteur anglophone — mais cela ne doit plus toucher au référencement.

## Ce qui sera fait

1. **Le SEO suit l'URL, pas le navigateur.** Le titre, la description, `og:*`, `twitter:*`, `og:locale` et la canonique seront calculés à partir du paramètre `hl` de l'URL (absent = français), plus jamais à partir de la langue détectée ou mémorisée.
2. **Canonique auto-référente.** Une page sans `hl` se déclarera canonique d'elle-même en français ; `?hl=en` se déclarera canonique en anglais. Fin de l'auto-canonisation vers l'anglais.
3. **Alternates hreflang** conservés et vérifiés : `fr` = URL nue, `en` = `?hl=en`, `x-default` = URL nue (français). Chaque version pointera bien vers l'autre, dans les deux sens.
4. **Attribut `lang` du document** aligné sur l'URL (`fr` par défaut) pour la version servie aux robots ; il continuera de refléter la langue d'affichage après interaction de l'utilisateur.
5. **Bascule de langue = changement d'URL.** Le bouton FR/EN ajoutera ou retirera `?hl=en`, pour que la version anglaise vue par l'utilisateur corresponde à une URL réellement indexable.
6. **Détection navigateur assouplie.** Un visiteur anglophone verra toujours l'interface en anglais, mais sans jamais réécrire les métadonnées de la page nue.
7. **Sitemaps** : vérification que `sitemap-fr.xml` (URLs nues) et `sitemap-en.xml` (`?hl=en`) restent cohérents avec ces règles.
8. **Vérification** : rendu de plusieurs pages avec un navigateur simulant `Accept-Language: en-US` (comme Googlebot) pour confirmer que le titre, la description et la canonique restent français sur l'URL nue, puis ping IndexNow et demande de réexploration dans Search Console.

## Détails techniques

- `src/components/i18n/SeoLocalizer.tsx` : remplacer la dépendance à `useLang()` par une « langue SEO » lue dans `search.hl` (fallback `fr`). Les overrides admin (`seo_overrides`) continueront d'être appliqués en dernier, indexés sur cette même langue SEO.
- `src/lib/i18n/index.tsx` : `detectBrowserLang()` reste pour l'UI ; ajout d'un flag pour distinguer « langue d'affichage » et « langue d'URL ».
- `src/components/i18n/LanguageToggle.tsx` : navigation via le routeur en ajoutant/retirant `hl=en` sur la route courante.
- `src/lib/canonical.ts` : inchangé sur les règles, mais tous les appels de `canonicalUrl` dans `SeoLocalizer` passeront la langue d'URL et non la langue d'UI.
- Contrôle final via Playwright (`extra_http_headers: Accept-Language: en-US`) sur `/`, `/actus`, `/chroniques`, une fiche article, avec lecture de `document.title` et de `link[rel=canonical]`.

## À noter

Google met généralement quelques jours à quelques semaines à réindexer. Le ping IndexNow et la demande d'indexation dans Search Console accélèrent, sans garantie de délai.
