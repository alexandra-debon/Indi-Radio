## Objectif
Refondre la barre d'en-tête (`src/components/AppShell.tsx`) pour qu'elle corresponde à la capture fournie et regroupe : menu · logo carré + wordmark « iNDi RaDiO » · cloche de notifications · bloc utilisateur (Connexion → pseudo cliquable + bouton « modifier profil »).

## Changements dans le header

Ordre final des cellules (grid 3 colonnes : `auto | 1fr | auto`) :

```text
[☰ Menu]   [🟨 logo carré + iNDi RaDiO wordmark → /]   [🔔 cloche] [pseudo / bonhomme]
```

1. **Colonne centrale** — lien vers `/` contenant côte à côte :
   - le petit logo carré (`indi-radio-logo.png.asset.json`, `size-8 sm:size-9`)
   - le wordmark (`indi-radio-wordmark-header.jpeg.asset.json`, `h-7 sm:h-9`)
   - un `gap-2`, centré, `shrink` pour rester dans la largeur dispo.

2. **Colonne droite** :
   - **Retirer** le `ShareButton` du header (le partage reste disponible sur chaque publication/podcast/émission, conforme au souhait).
   - **Retirer** le `LanguageToggle` du header pour libérer de la place (à confirmer — voir question ci-dessous). Sinon on le déplace dans le drawer menu.
   - Conserver `NotificationsBell` (cloche avec pastille).
   - Bloc auth :
     - **Déconnecté** : bouton texte `Connexion` (inchangé).
     - **Connecté** : 
       - `UserBadge` compact (pseudo + éventuel rôle) → lien vers `/u/$pseudo` (profil **public**), tronqué à `max-w-[7rem] sm:max-w-[10rem]`.
       - Petit bouton icône bonhomme (`UserIcon`, `size-8` bordé) → lien vers `/profile/edit` (modifier le profil), avec tooltip « Modifier mon profil ».
       - Sur mobile (< sm) : masquer le pseudo texte et n'afficher que le bouton bonhomme (qui pointe alors vers `/profile` pour rester utile) + garder un petit avatar rond cliquable vers le profil public si la place le permet.
     - Admin : garder le badge Admin `lg:inline-flex` inchangé.

3. **Suppression de la flèche ↗** actuelle (remplacée par le pseudo lui-même qui est déjà le lien vers le profil public → plus lisible).

## Fichier modifié
- `src/components/AppShell.tsx` uniquement (imports : retirer `ShareButton`, `ArrowUpRight` ; garder `UserIcon`, `NotificationsBell`, `UserBadge`, `Tooltip*`).

## Vérification
- Playwright screenshots à 360 px, 390 px, 768 px, 1280 px pour confirmer :
  - centrage du bloc logo+wordmark,
  - non-débordement du pseudo long (troncature),
  - cloche + bouton bonhomme toujours visibles sur iPhone SE (360 px).

## Question rapide avant build
Le sélecteur de langue FR/EN : je le déplace dans le menu latéral (drawer) pour libérer la place dans le header, OK ? Sinon je le garde dans le header en le réduisant.
