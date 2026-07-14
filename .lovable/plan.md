
# Indi Radio — plan de build v1

App web (mobile-first) pour Indi Radio, la radio du hub InDi ArT CulTuRe. Identité noir / jaune franc, titres façon fanzine "découpé", corps lisible. Backend Lovable Cloud (Supabase) région Europe.

## Ce que je livre dans cette première itération

### 1. Design system (src/styles.css)
- Tokens noir dominant, jaune signature, gris très foncé pour cartes, jaune → texte noir gras pour CTA.
- Font display "cutout/fanzine" pour titres de section (via Google Fonts, chargée par `<link>` dans __root), font sans lisible pour le corps.
- Variantes Button (`hero` jaune plein, `outline-yellow`), styles Badge pour rôles + certification.

### 2. Base de données (Lovable Cloud)
Migration unique avec toutes les tables du prompt : profiles, point_events, track_history, track_likes, posts, podcasts, episodes, episode_ratings, shows, requests, newsletter_subscribers, news_posts, news_likes, news_comments. GRANTs public schema, RLS activée sur chaque table, policies exactement comme spécifiées (lecture publique large, écriture authentifiée, `role`/`is_certified` seulement admin, points/level jamais côté client). Fonction `calculate_level`, fonction `award_points` (security definer), tous les triggers de gamification (post, news_like, news_comment, request). Trigger `on_auth_user_created` qui insère la ligne `profiles` par défaut. Rôles stockés dans profiles.role (le spec demande ça explicitement) — je respecte le prompt utilisateur plutôt que le pattern user_roles séparé, en documentant la contrainte via policy `has_admin_role` en SECURITY DEFINER pour éviter la récursion RLS.

### 3. Auth
Email / mot de passe uniquement (spec). Écran /auth (login + signup avec pseudo). Hook `useAuth` global. Toute action de contribution qui échoue faute de session ouvre le dialog auth.

### 4. Lecteur radio persistant
- URL flux dans `src/config/radio.ts` (variable centralisée) : `http://ecmanager6.pro-fhi.net:2180/stream`.
- Composant `<RadioPlayerProvider>` monté dans `__root.tsx` au-dessus de `<Outlet />` → l'élément `<audio>` ne se démonte jamais lors des navigations, la lecture continue.
- Mini-lecteur fixe en bas d'écran sur toutes les pages : pochette placeholder, titre/artiste du dernier `track_history`, play/pause, bouton like cœur avec compteur realtime.
- Note : en web l'ATS iOS ne s'applique pas ; je documente dans le README que pour un futur wrapper natif il faudra ajouter `NSExceptionDomains` ciblé sur `ecmanager6.pro-fhi.net` (jamais `NSAllowsArbitraryLoads`).

### 5. Routes (TanStack Router, une route par surface partageable)
- `/` — Live : lecteur + mur social realtime + historique récent
- `/chart` — onglets "Cette semaine" / "All time"
- `/actus` — fil Indi Rézo (list + détail inline avec likes/commentaires)
- `/emissions` — 3 sous-onglets Émissions / Chroniques / Animateurs, carrousels
- `/podcasts` — grille + détail épisodes + notation
- `/dedicaces` — formulaire requests
- `/about` — texte structure vs radio
- `/newsletter` — formulaire inscription (ou intégré dans footer)
- `/auth` — public
- `/_authenticated/admin` — panneau admin (recherche profil, change role, toggle is_certified, création news_post, modération requests)

Chaque route publique : `head()` propre (title / description / og:title / og:description distincts).

### 6. Badges & gamification
Composant `<UserBadge profile={...} />` réutilisé partout où un pseudo apparaît : badge rôle (Admin couronne rouge, Animateur micro jaune, Artiste étiquette, Auditeur → "Niv. X") + rond ✓ certification si `is_certified`. Sur `/profile` : points, niveau, barre de progression.

Présence live : timer côté client qui appelle une server function `awardPresencePoint` toutes les 5 min d'écoute active, avec plafond quotidien vérifié côté serveur (max ~10 points/jour) avant insert dans `point_events`.

### 7. Mur social realtime
Supabase realtime channel sur `posts` → nouveaux posts apparaissent instantanément. Rendu des mentions `@xxx` en jaune gras.

### 8. Admin
Route sous `_authenticated`, mais aussi guard applicatif qui vérifie `profile.role === 'admin'` (les policies RLS bloquent de toute façon les mutations sensibles). Menu masque l'entrée admin sinon.

### 9. Navigation
Drawer slide-in gauche (icône hamburger), header fixe avec placeholder logo carré + wordmark "INDI RADIO" en étiquette jaune/noir. Le vrai logo sera intégré à une itération suivante.

## Détails techniques

- Stack : TanStack Start + React + Tailwind v4 + shadcn (déjà en place).
- Cloud : activation Lovable Cloud (Supabase) requise avant migration — je le fais en début d'exécution.
- Server functions : lecture publique via client publishable (chart, historique, news, shows, podcasts, episodes) ; actions authentifiées via `requireSupabaseAuth` (like, post, comment, rating, request, presence). Admin via `requireSupabaseAuth` + check `has_role('admin')`.
- Realtime uniquement sur `posts` (mur live) pour v1 — pas sur likes ni news pour limiter la charge.
- Zéro couleur codée en dur dans les composants ; tout via tokens.

## Ce que je NE fais PAS dans cette itération (confirmé par le prompt)
- Intégration du vrai logo (fichier à venir)
- Config ATS iOS native (l'app est web ici)
- Metadata "now playing" temps réel depuis Icecast (pas d'endpoint fiable mentionné — j'utilise le dernier `track_history` inséré ; un futur cron peut poller `/status-json.xsl` d'Icecast pour alimenter `track_history` automatiquement)

## Questions avant de lancer

1. **Comment la table `track_history` se remplit-elle ?** Le lecteur audio est un flux Icecast qui ne pousse pas les métadonnées côté client. Options : (a) je scrappe `http://ecmanager6.pro-fhi.net:2180/status-json.xsl` via une server function déclenchée périodiquement côté client (toutes les 30 s tant qu'un auditeur écoute) et j'insère les nouveaux titres — simple, pas de cron ; (b) je te laisse alimenter `track_history` manuellement / via un cron externe pour v1 et j'affiche juste ce qui est en base. **Je pars sur (a) par défaut** sauf indication contraire.

2. **Confirmation gamification "présence"** : plafond quotidien à 10 points/jour d'écoute (soit ~50 min actives), OK ?

Réponds "ok" ou corrige, et j'exécute.
