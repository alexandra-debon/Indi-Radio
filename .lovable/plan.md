# Search Console : passer sur la propriété www et re-soumettre les sitemaps

## Constat vérifié à l'instant

Dans votre compte Search Console, **une seule propriété est vérifiée** :

```text
https://radio.indi-art-culture.com/   (propriétaire)
```

La propriété `https://www.radio.indi-art-culture.com/` **n'existe pas encore**. Or une propriété « préfixe d'URL » est liée à un hôte précis : celle sans `www` ne couvre pas `www.`. Impossible donc de soumettre les sitemaps sur la propriété www tant qu'elle n'est pas créée et vérifiée.

Le site déclare déjà une balise de vérification Google dans son en-tête, mais elle correspond à la propriété sans `www` ; il faut y ajouter (sans la retirer) celle de la nouvelle propriété.

## Ce que je ferai

1. **Demander un jeton de vérification** à Google pour `https://www.radio.indi-art-culture.com/` (méthode balise meta).
2. **Ajouter la balise** dans l'en-tête du site (`src/routes/__root.tsx`), à côté de la balise existante qui sera conservée.
3. **Vous demander de publier** une fois — Google doit voir la balise en ligne sur le domaine www.
4. **Lancer la vérification**, puis **ajouter la propriété** à votre liste Search Console.
5. **Soumettre les trois sitemaps** sur cette nouvelle propriété :
   - `https://www.radio.indi-art-culture.com/sitemap.xml`
   - `https://www.radio.indi-art-culture.com/sitemap-fr.xml`
   - `https://www.radio.indi-art-culture.com/sitemap-en.xml`
6. **Contrôler le résultat** : relire l'état de chaque sitemap (date de lecture, erreurs, nombre d'URLs) et vous en faire le récapitulatif.

## À savoir

- L'ancienne propriété sans `www` est conservée : elle reste utile pour suivre la migration et l'historique. Rien n'est supprimé.
- Les URLs sans `www` redirigent vers `www`, donc Google transférera progressivement l'autorité. L'historique de performances ne fusionne pas automatiquement entre les deux propriétés : les nouvelles données arriveront sur la propriété www.
- Une seule étape dépend de vous : publier le site après l'ajout de la balise.

## Détails techniques

- `POST /siteVerification/v1/token` avec `{ site: { identifier: "https://www.radio.indi-art-culture.com/", type: "SITE" }, verificationMethod: "META" }`.
- Ajout d'une entrée `{ name: "google-site-verification", content: "<token>" }` dans le tableau `meta` de `head()` dans `src/routes/__root.tsx` (la valeur actuelle `c0A7GB…` est conservée).
- `POST /siteVerification/v1/webResource?verificationMethod=META`, puis `PUT /webmasters/v3/sites/{siteUrl encodé}`.
- Soumission : `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{sitemapUrl}` pour les trois fichiers, puis `GET` de chacun pour lire l'état.
- Aucune modification de logique métier, de design ou de données.
