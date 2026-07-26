## Objectif

Ajouter sur la page **À propos** une nouvelle section « Ils nous diffusent au travers du monde », placée **sous** le logo SACEM (qui reste en bas), listant les plateformes qui rediffusent InDi RaDio. Contenu géré depuis le panneau admin, mis à jour à la volée. Section **masquée dans les futures apps natives iOS/Android** (App Store / Play Store), mais visible sur desktop, mobile web et PWA installée.

## Ce qui sera construit

### 1. Table `broadcast_partners` (Lovable Cloud)

Colonnes :
- `id` (uuid, pk)
- `name` (text) — ex. « TuneIn », « Internet Radio »
- `kind` (text: `logo` | `html`) — deux modes d'intégration
- `logo_url` (text, nullable) — pour le mode logo (upload via bucket existant `content-images` ou URL externe)
- `link_url` (text, nullable) — cible du clic en mode logo
- `alt_text` (text, nullable) — accessibilité du logo
- `html_snippet` (text, nullable) — pour le mode HTML (bannière fournie par la plateforme)
- `position` (int) — ordre d'affichage (drag/monter-descendre)
- `is_active` (bool, défaut true)
- `created_at`, `updated_at`

RLS + GRANT :
- `SELECT` public (anon + authenticated) filtré sur `is_active = true` → la section s'affiche sans compte.
- `INSERT / UPDATE / DELETE` réservés aux admins via `has_role(auth.uid(), 'admin')`.
- Grants explicites `anon` SELECT, `authenticated` SELECT, `service_role` ALL.

### 2. Rendu sur `/about`

Sous le bloc SACEM actuel, nouveau bloc `card-brut` :

```text
┌────────────────────────────────────────┐
│  Ils nous diffusent au travers du monde │
│                                        │
│  [logo TuneIn]  [bannière Internet Radio]  [logo X]  ... │
└────────────────────────────────────────┘
```

- Mode `logo` : `<a href={link_url}><img src={logo_url} alt={alt_text} /></a>` (ouverture nouvel onglet, `rel="noopener noreferrer"`).
- Mode `html` : rendu du `html_snippet` **assaini** avec DOMPurify (whitelist stricte : `a`, `img`, attrs `href`, `src`, `alt`, `title`, `target`, `rel`) — indispensable puisque les bannières sont du HTML tiers.
- Le logo SACEM et sa légende restent inchangés, **au-dessus** du nouveau bloc.
- La ligne actuelle TuneIn dans le bloc SACEM est **retirée** ; TuneIn est réinséré comme première entrée de `broadcast_partners` via la migration (seed).

### 3. Masquage sur apps natives

- Détection via `Capacitor.isNativePlatform()` (déjà utilisé dans `src/lib/native.ts`).
- Web / PWA installée : `isNativePlatform()` renvoie `false` → section affichée.
- iOS/Android App Store natif : `true` → section masquée entièrement.

### 4. Panneau admin

Nouvel onglet/section dans `src/routes/_authenticated/admin.tsx` : « Diffuseurs ».
- Liste triable des partenaires (monter/descendre pour ajuster `position`).
- Formulaire ajout/édition : choix `Logo + lien` ou `HTML fourni`, upload logo via bucket existant, prévisualisation du rendu.
- Toggle actif/inactif, suppression avec confirmation.
- i18n FR/EN pour les libellés admin et le titre de section.

## Détails techniques

- Migration SQL unique : create table + GRANT + RLS + policies + seed TuneIn.
- Composant `BroadcastPartners.tsx` chargé via TanStack Query (`queryOptions`, `useSuspenseQuery`) primé dans le loader de `/about`.
- Assainissement HTML : ajout de `dompurify` (léger, compatible SSR via import dynamique côté client uniquement — rendu du snippet gated par `useHydrated`).
- Titre de section traduit via clés `page.about.broadcasters.title` déjà existantes ? Sinon ajout aux dictionnaires FR/EN.
- Aucun changement des logos existants (SACEM reste, TuneIn migre vers la nouvelle liste).

## Hors périmètre

- Statistiques de diffusion, hits par plateforme.
- Import automatique depuis un flux tiers.
- Version mobile native (masquée par design).