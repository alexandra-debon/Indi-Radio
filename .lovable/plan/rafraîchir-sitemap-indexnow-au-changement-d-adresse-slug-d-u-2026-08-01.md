# Rafraîchir sitemap + IndexNow au changement d'adresse (slug) d'une playlist

Aujourd'hui, quand l'admin modifie l'adresse d'une playlist, la nouvelle adresse est bien signalée aux moteurs, mais l'ancienne ne l'est pas — Google/Bing gardent donc longtemps l'ancienne URL en index sans voir la redirection. Le sitemap est en plus mis en cache 5 minutes, et l'écran admin ne rafraîchit pas la page publique.

## Ce qui va changer

1. **Signalement de l'ancienne adresse**
   Dès qu'un slug change, les moteurs reçoivent en une fois : l'ancienne adresse (pour qu'ils constatent la redirection 301), la nouvelle adresse, la page `/playlists` et les sitemaps.

2. **Sitemaps rafraîchis plus vite**
   Le sitemap principal et les variantes FR/EN passent en revalidation quasi immédiate (comme le sitemap des membres), pour que la nouvelle adresse y apparaisse tout de suite.

3. **Cache de l'application invalidé**
   Après une modification en admin (adresse, publication, titre, ordre), les listes et pages de playlists se rechargent immédiatement, sans recharger le navigateur.

## Détails techniques

- Migration : nouvelle fonction `notify_search_engines_paths(text[])` qui envoie un seul POST vers `/api/public/hooks/indexnow` avec tous les chemins.
- Migration : ajout d'un trigger AFTER UPDATE `trg_indexnow_playlist_slug_change` sur `playlist_entries` qui, si `OLD.slug IS DISTINCT FROM NEW.slug`, envoie `['/playlists', '/playlists/<ancien>', '/playlists/<nouveau>']`. Le trigger BEFORE UPDATE existant continue d'alimenter `playlist_slug_history`.
- `trg_indexnow_playlist_entries` est ajusté pour ne pas dupliquer le ping quand le changement de slug a déjà été signalé.
- `src/lib/sitemap-entries.ts` : `Cache-Control` aligné sur le sitemap des membres — `public, max-age=0, s-maxage=60, stale-while-revalidate=600, must-revalidate`.
- `src/components/admin/PlaylistsAdmin.tsx` et `src/components/playlists/PlaylistEntryEditor.tsx` : invalidation de `["playlist-entries"]`, `["admin-playlist-entries"]` et appel à `router.invalidate()` pour recharger les loaders de `/playlists` et `/playlists/$slug`.