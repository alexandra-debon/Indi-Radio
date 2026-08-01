# Partage individuel des playlists

## État actuel

Chaque carte de playlist affiche déjà une icône de partage. Elle transmet le titre (version FR ou EN selon la langue active) et la présentation en texte d'accompagnement. En revanche, le lien partagé est toujours `/playlists` : quelqu'un qui clique arrive en haut de la page, et l'aperçu (titre + description) affiché par Facebook, LinkedIn ou Substack est celui de la page globale, pas celui de la playlist concernée.

## Ce que je propose

1. **Lien profond par playlist**
   Chaque carte reçoit une ancre stable (`/playlists#playlist-<id>`). Le bouton de partage envoie cette URL, et à l'arrivée la page fait défiler jusqu'à la playlist et la met brièvement en surbrillance.

2. **Vraie page par playlist (aperçu correct sur les réseaux)**
   Nouvelle route `/playlists/<slug>` affichant une seule playlist : titre, présentation, les deux lecteurs Spotify et Apple Music, et un lien de retour vers la page complète. Cette page porte ses propres métadonnées (titre, description, og/twitter) dans la langue par défaut, donc l'aperçu partagé correspond exactement à la playlist.
   Le bouton de partage des cartes pointe alors vers cette page dédiée plutôt que vers l'ancre.

3. **Cohérence SEO**
   Ajout des pages playlists au sitemap, canonical auto-référencée, JSON-LD `MusicPlaylist` par playlist, ping IndexNow à la publication comme pour les autres contenus.

## Détails techniques

- Colonne `slug` sur `playlist_entries` (unique, générée à partir du titre FR, éditable dans l'admin) — migration nécessaire.
- Route `src/routes/playlists.$slug.tsx` : chargement de la playlist publiée, `head()` dédié avec `og:title` / `og:description` / `og:url` / canonical, JSON-LD `MusicPlaylist`.
- `ShareButton` des cartes : `url: canonicalUrl("/playlists/" + slug)`.
- `src/lib/sitemap-entries.ts` : ajout des URLs de playlists publiées.
- Aucune image de couverture n'est disponible aujourd'hui : pas de `og:image` tant qu'on n'ajoute pas un visuel par playlist (possible dans un second temps, avec upload dans l'éditeur admin).
