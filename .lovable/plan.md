## Objectif

Créer une page publique **« Galerie Artistes »** qui liste automatiquement les profils certifiés « Artiste », alimentée depuis le panneau admin lors de la certification, avec fiche enrichie (nom de scène, résumé admin, visuel dédié), recherche, ordre alphabétique, opt-out de l'artiste, et raccourci pour lancer une publication qui mentionne l'artiste.

## 1. Base de données (migration)

Nouvelles colonnes sur `public.profiles` :
- `stage_name text` — nom de groupe/formation saisi par l'admin à la certification
- `gallery_visible boolean not null default true` — opt-in/out de l'artiste
- `gallery_cover_url text` — visuel (logo/pochette) uploadé par l'admin
- `gallery_summary text` — résumé rédigé par l'admin

Mise à jour du trigger `protect_profile_privileged_fields` : `stage_name`, `gallery_cover_url`, `gallery_summary` réservés aux admins ; `gallery_visible` modifiable par le propriétaire.

Politique RLS : lecture publique (anon + authenticated) des profils où `is_certified = true AND role = 'artiste' AND gallery_visible = true AND quarantined_at IS NULL` (colonnes de galerie uniquement — les policies actuelles couvrent déjà la lecture publique des profils, à vérifier au moment du build).

Bucket storage `artist-gallery` (public), limite 50 Mo/fichier, policies : SELECT public, INSERT/UPDATE/DELETE réservés aux admins.

## 2. Panneau admin — action « Certifier artiste »

Dans `src/routes/_authenticated/admin.tsx`, section utilisateurs : bouton **« Certifier artiste »** ouvre un dialog avec :
- champ **Nom de scène / groupe** (préremplit avec le pseudo)
- champ **Résumé** (textarea)
- upload **visuel de galerie** (max 50 Mo, via bucket `artist-gallery`)
- bouton **Valider** → set `role='artiste'`, `is_certified=true`, `stage_name`, `gallery_summary`, `gallery_cover_url`

Bouton secondaire **Éditer la fiche galerie** pour rééditer un artiste déjà certifié, et **Retirer la certification**.

## 3. Page publique `/artistes`

Route `src/routes/artistes.tsx` :
- Titre court : **« Galerie Artistes »** (dans le menu principal)
- Barre de recherche (filtre client sur `stage_name` + `pseudo`)
- Grille de cartes triées alphabétiquement par `stage_name` (fallback `pseudo`)
- Chaque carte : visuel (gallery_cover > avatar > placeholder), nom de scène, pseudo, résumé court, icônes réseaux sociaux (depuis `social_links`), lien vers `/u/$pseudo`
- SEO : head() dédié FR/EN, canonical, og:image = première pochette
- i18n via `useT` (nouvelles clés dans `dict.ts`)

Ajout de l'entrée « Galerie Artistes » dans la navigation (`AppShell.tsx`).

## 4. Contrôle côté artiste

Dans `src/routes/_authenticated/profile.edit.tsx` : toggle **« Apparaître dans la Galerie Artistes »** (édite `gallery_visible`) — visible uniquement si `role='artiste' AND is_certified=true`. Explication courte à côté.

## 5. Raccourci « Mentionner cet artiste »

Sur la carte galerie et sur `/u/$pseudo` (si artiste certifié) : bouton **« Écrire à @pseudo »** qui navigue vers `/en-direct` (mur social) en ouvrant le composer pré-rempli avec `@pseudo `. Implémentation : query param `?mention=pseudo` lu par `SocialWallPanel`/composer pour ouvrir le Sheet et préfixer le textarea.

## 6. Onboarding

Ajouter une étape dans `OnboardingTour.tsx` pointant vers l'entrée « Galerie Artistes » du menu.

## Détails techniques

- Migration unique : ALTER TABLE profiles + trigger update + bucket + policies storage.
- Aucun changement au trigger `handle_new_user`.
- Upload admin via `supabase.storage.from('artist-gallery').upload(...)`, URL publique stockée dans `gallery_cover_url`.
- Requête publique : `supabase.from('profiles').select('id, pseudo, avatar_url, stage_name, gallery_cover_url, gallery_summary, social_links').eq('role','artiste').eq('is_certified',true).eq('gallery_visible',true).is('quarantined_at',null).order('stage_name',{nullsFirst:false})`.
- Le composer social wall accepte déjà les mentions ; l'ajout `?mention=` déclenche l'ouverture du Sheet et injecte le texte initial.

## Ce qui n'est PAS inclus

- Pas de modification des systèmes de points/badges.
- Pas de refonte des profils publics existants (juste un bandeau « Artiste certifié » déjà présent).
- Pas de messagerie directe : le raccourci passe par le mur social public, comme demandé.
