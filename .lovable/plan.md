# robots.txt : crawl cohérent avec le hreflang

Les deux sitemaps par langue sont déjà déclarés (`sitemap-fr.xml` et `sitemap-en.xml`, plus l'index et les sitemaps profils/images/vidéos). Le vrai problème est ailleurs : les blocs `User-agent: Googlebot` et `User-agent: Bingbot` ne reprennent pas les règles de paramètres définies dans le bloc `*`.

En robots.txt, un robot n'applique **que** le bloc le plus spécifique le concernant. Googlebot et Bingbot ignorent donc aujourd'hui :

- `Allow: /*?hl=` — la version anglaise `?hl=en`
- `Allow: /*?page=` — la pagination
- les `Disallow` sur `utm_`, `fbclid`, `gclid`, `mc_cid`, `ref`

Résultat : ils crawlent librement les URL de tracking (doublons) et n'ont aucune autorisation explicite pour les URL `?hl=en` visées par le hreflang.

## Ce qui sera modifié

Uniquement `public/robots.txt` :

1. Ajouter dans les blocs `Googlebot` et `Bingbot` les mêmes règles de paramètres que dans le bloc `*` (Allow `?hl=` et `?page=` placés avant les Disallow de tracking, pour que l'autorisation prime).
2. Ajouter `Disallow: /rss-test` (page de debug des flux, déjà en `noindex`) dans les trois blocs.
3. Ajouter un court commentaire expliquant le lien entre `?hl=en`, le hreflang et les sitemaps par langue, pour que la règle ne soit pas supprimée par erreur plus tard.
4. Mettre à jour la date de dernière modification en en-tête.

## Hors périmètre

Pas de changement des sitemaps, des balises hreflang ou du code applicatif : ils sont déjà cohérents (apex `radio.indi-art-culture.com`, sans slash final, `fr-FR` / `en` / `x-default`).
