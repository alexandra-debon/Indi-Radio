# Page SEO admin connectée à Google Search Console

Oui, c'est possible : le compte Google Search Console est déjà connecté au projet. On ajoute un onglet **SEO** dans le panneau admin qui lit les vraies données GSC et permet de demander l'indexation.

## Ce que la page affichera

1. **Sélection de propriété** — liste des propriétés vérifiées du compte Google connecté. Si une seule correspond à radio.indi-art-culture.com, elle est choisie automatiquement ; sinon un sélecteur s'affiche.
2. **Performance de recherche** — clics, impressions, CTR moyen, position moyenne sur 7 / 28 / 90 jours, avec :
   - Top 25 requêtes (mots-clés qui amènent du trafic)
   - Top 25 pages
   - Répartition par pays et par appareil
3. **Inspection d'URL** — champ de recherche : on colle ou on choisit une URL de l'app, et on voit l'état Google (indexée ou non, date du dernier crawl, canonical retenue, problèmes d'exploration, résultats enrichis, ergonomie mobile).
4. **État d'indexation global** — tableau de toutes les routes publiques de l'app (accueil, à propos, actus, podcasts, émissions, chroniques, clips, magazines, chart, top, artistes, coups de cœur, contact, soumission artistes, etc.) avec un bouton « Inspecter » par ligne et un mode « Tout inspecter » séquentiel, résultats mis en cache.
5. **Sitemaps** — liste des sitemaps soumis à GSC (sitemap.xml, -fr, -en, -users, -images, -video), date de dernière lecture, erreurs éventuelles, et bouton « Soumettre / resoumettre » pour chacun.
6. **Ping IndexNow** — réutilise le hook IndexNow déjà en place pour pousser une ou plusieurs URLs vers Bing/Yandex en un clic.
7. **Lien vers l'aperçu SEO existant** (`/admin/seo-preview`) pour la comparaison des balises FR/EN.

## Détails techniques

- Nouvelle route `src/routes/_authenticated/admin.seo.tsx` (noindex, réservée admin), plus une carte « SEO » et un onglet dans `admin.tsx` comme pour « Diffuseurs ».
- Nouveau `src/lib/seo-console.functions.ts` avec des server functions protégées par `requireSupabaseAuth` + vérification du rôle admin via `has_role` avant tout appel :
  - `listSearchConsoleSites` — liste les propriétés vérifiées
  - `querySearchAnalytics` — clics/impressions/requêtes/pages/pays/appareils
  - `inspectUrl` — inspection d'une URL
  - `listSitemaps` / `submitSitemap`
- Tous les appels passent par le connector gateway Lovable (`connector-gateway.lovable.dev/google_search_console`) côté serveur uniquement, avec `LOVABLE_API_KEY` + la clé de connexion ; jamais côté navigateur.
- La propriété GSC n'est jamais codée en dur : elle est résolue à l'exécution depuis la liste des propriétés vérifiées, avec sélection utilisateur en cas d'ambiguïté.
- Les erreurs Google (403, quota, scope manquant) sont remontées telles quelles dans l'interface avec un message clair.
- Chargement des données via TanStack Query (cache 5 min) et bouton « Rafraîchir ».
- L'inspection d'URL est limitée par Google (~2000/jour, 600/min) : on inspecte à la demande, en file séquentielle, avec indicateur de progression.

## Hors périmètre

- Pas de modification des balises SEO existantes ni des sitemaps eux-mêmes.
- Pas de stockage en base des historiques GSC dans cette première version (données lues en direct).
