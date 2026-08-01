# Playlists InDi RaDio

Nouvelle page publique `/playlists` mettant en avant les playlists de la radio, chacune avec ses deux lecteurs (Spotify + Apple Music), plus une section d'administration dédiée pour créer/éditer les playlists.

## Disposition de la page publique

```text
┌──────────────────────────────────────────────┐
│  Titre : Playlists InDi RaDio                │
│  Chapô : la sélection 24/7 de la radio indé  │
├──────────────────────────────────────────────┤
│  ★ INDÉGRAAL  (bloc vedette, pleine largeur) │
│  description éditoriale                      │
│  ┌──────────────┐ ┌──────────────┐           │
│  │  Spotify     │ │ Apple Music  │           │
│  └──────────────┘ └──────────────┘           │
├──────────────────────────────────────────────┤
│  INDISCOVERY (par année, onglets 2026/2027…) │
│  [même bloc à deux lecteurs]                 │
├──────────────────────────────────────────────┤
│  THÉMATIQUES (grille 2 colonnes desktop,     │
│  1 colonne mobile, cartes dépliables)        │
└──────────────────────────────────────────────┘
```

- Trois sections : **IndéGraal** (vedette), **InDiscovery** (onglets d'année, générés automatiquement à partir des playlists existantes), **Thématiques** (grille).
- Chaque playlist = une carte : titre, description en texte riche, puis les deux lecteurs côte à côte (empilés sur mobile), avec les libellés « Spotify » / « Apple Music ».
- Une seule description par playlist, partagée par les deux lecteurs (les titres sont identiques).
- Style repris du reste de l'app (accents jaunes, cartes, typographie existante). Traduction FR/EN via le système `TranslatedText` déjà en place.

## Pop-up d'avertissement Spotify

- S'ouvre à l'arrivée sur `/playlists`, fermable (bouton + clic sur le fond), avec case à cocher « Ne plus afficher ce message » mémorisée en `localStorage`.
- Un petit lien discret en bas de page permet de relire le message à tout moment.
- Texte relu et corrigé (orthographe/ponctuation), en FR et EN.

## Section admin

Nouvel onglet **Playlists** dans le panneau admin, sur le modèle des éditeurs existants (Magazines / Clips) :

- Créer, éditer, supprimer, réordonner une playlist.
- Champs : titre, description (éditeur riche existant), catégorie (IndéGraal / InDiscovery / Thématique), année (pour InDiscovery), code d'intégration Spotify, code d'intégration Apple Music, visibilité, position.
- Aperçu direct des deux lecteurs dans l'éditeur avant publication.

## Détails techniques

- Table `playlist_entries` : `title`, `description`, `category`, `year`, `spotify_embed`, `apple_embed`, `position`, `is_published`, `author_id`, timestamps + trigger `updated_at`. GRANTs : lecture `anon`/`authenticated` sur les publiées, écriture réservée aux admins via RLS `has_role(auth.uid(),'admin')`.
- Les codes d'intégration sont stockés bruts mais **jamais** injectés en HTML : on en extrait l'URL de l'iframe et on rend un `<iframe>` contrôlé (allowlist stricte `open.spotify.com` / `embed.music.apple.com`), avec `loading="lazy"`, `sandbox` et hauteurs adaptées.
- Route publique `src/routes/playlists.index.tsx` avec `head()` dédié (titre, description, og/twitter), JSON-LD `MusicPlaylist`, entrée dans le sitemap et dans la navigation principale.
- Ping IndexNow à la publication, cohérent avec les autres contenus.
