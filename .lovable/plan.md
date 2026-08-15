# Aligner tout le site sur www.radio.indi-art-culture.com

## Le constat (vérifié en direct)

Votre fichier d'audit a raison, et j'ai confirmé le problème :

- `https://radio.indi-art-culture.com/...` répond **302** (redirection) vers `https://www.radio.indi-art-culture.com/...`
- `https://www.radio.indi-art-culture.com/` répond **200** (page finale)

Or le site déclare partout l'adresse **sans www** comme adresse officielle : balises canoniques, hreflang, sitemaps, robots.txt, flux RSS, aperçus de partage. Google reçoit donc une liste d'URLs qui redirigent toutes, ce qui dilue le référencement et ralentit l'indexation.

Le plan est donc applicable — mais plutôt qu'un remplacement URL par URL (les 108 lignes du CSV), la bonne correction est de changer l'adresse de référence **à la source** : les sitemaps se régénèrent alors automatiquement avec les bonnes URLs, y compris pour les contenus futurs.

## Ce qui sera fait

1. **Adresse de référence unique** — passer l'origine du site à `https://www.radio.indi-art-culture.com` dans le module central de canonisation. Cela corrige d'un coup : canoniques, hreflang (fr-FR / fr / en / x-default), sitemaps FR/EN/profils/images/vidéos et l'index de sitemaps.
2. **Adresses écrites en dur** — environ 130 occurrences de l'ancienne adresse subsistent dans des pages et scripts (pages `about`, `terms`, `top`, `emissions`, profils, albums, tags, soumission artistes, etc.). Elles seront toutes basculées sur `www`, et les pages concernées passeront autant que possible par le module central pour éviter que le problème revienne.
3. **robots.txt** — les six lignes `Sitemap:` et le commentaire d'en-tête pointeront vers `www`.
4. **Flux RSS et aperçus de partage** — liens, `og:url`, images et identifiants d'articles alignés sur `www`, pour que Facebook / LinkedIn / Substack et les agrégateurs pointent la bonne adresse.
5. **Notifications automatiques aux moteurs** — les tâches planifiées côté base (IndexNow, ping des sitemaps) appellent aujourd'hui l'ancienne adresse ; elles seront mises à jour, plus la clé IndexNow servie sur `www`.
6. **Outils de vérification** — les scripts de contrôle (URLs, hreflang, RSS, vérification après publication) prendront `www` comme adresse par défaut, pour détecter toute rechute.
7. **Application mobile** — l'adresse embarquée dans la configuration Capacitor sera alignée.

## Après la mise en ligne (côté vous)

- Dans Search Console : ajouter/valider la propriété `www.radio.indi-art-culture.com` si ce n'est pas déjà fait, puis re-soumettre `sitemap.xml`, `sitemap-fr.xml` et `sitemap-en.xml`.
- L'ancienne adresse continuera de rediriger : les liens existants restent valides, Google transférera progressivement l'autorité.

## Point d'attention

La redirection actuelle est un **302 (temporaire)**. L'idéal pour le SEO est un **301 (permanent)**. Ce comportement est géré par l'hébergement Lovable et non par le code : si le 302 persiste après la bascule, ce n'est pas bloquant (Google finit par consolider), mais je vous le signalerai pour un éventuel signalement au support.

## Détails techniques

- `src/lib/canonical.ts` : `SITE_ORIGIN` → `https://www.radio.indi-art-culture.com` (source unique consommée par `sitemap-entries.ts`, `og-lang`, `seo-meta`, `rss.ts`).
- Remplacement global de `https://radio.indi-art-culture.com` dans `src/routes/**`, `src/lib/**`, `public/robots.txt`, `scripts/*.mjs`, `capacitor.config.ts`.
- Nouvelle migration SQL mettant à jour les fonctions/jobs `pg_cron` appelant `/api/public/hooks/indexnow`, `/api/public/hooks/ping-sitemaps` et `/api/public/admin-message-email` (les anciennes migrations ne sont pas modifiées).
- Défauts `CHECK_BASE_URL` / `BASE_URL` / `PROD` mis à jour dans `publish-verify.mjs`, `post-publish-check.mjs`, `verify-hreflang.mjs`, `rss-diff.mjs`, `check-seo-tagline.mjs`, `verify-urls.mjs`.
- Aucune modification de la logique métier, du design ou des données.
