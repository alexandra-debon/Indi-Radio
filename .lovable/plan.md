# Embeds média & page Clip Addict

## 1. Système d'embed universel

**Nouveau composant `src/components/media/UrlEmbeds.tsx`** — scanne un texte, extrait toutes les URLs et rend :
- **YouTube** (`youtube.com/watch`, `youtu.be`, `youtube.com/shorts`, `youtube.com/playlist`) → lecteur inline
- **Vimeo** (`vimeo.com/{id}`) → lecteur inline
- **Autres URLs** → carte d'aperçu (image + titre + description via Open Graph)

**Composant `VideoPlayer`** :
- Lecteur inline responsive (ratio 16/9, `iframe` YouTube/Vimeo avec `allowfullscreen`)
- Bouton "Agrandir" en overlay → ouvre un **modal shadcn Dialog** plein écran (95vw / 95vh)
- Fullscreen natif via l'iframe (permet la rotation paysage sur mobile — l'API Fullscreen de l'iframe s'adapte à l'orientation du device)

**Serveur `src/lib/link-preview.functions.ts`** — `createServerFn` qui fetch une URL, parse les balises `<meta og:*>` / `<meta twitter:*>` et renvoie `{ title, description, image, siteName }`. Cache mémoire simple + timeout 5s + fallback silencieux.

**Intégration dans les zones de publication existantes** :
- `SocialWall.tsx` (posts + commentaires) — juste après `renderMentions(content)`
- `src/routes/actus.tsx` (news_posts + commentaires)
- `src/routes/chroniques.$slug.tsx` (corps d'article)

## 2. Page Clip Addict `/clips`

**Nouvelle table `clip_entries`** :
- `id`, `section` (`clips_actu` | `playlists_clips`), `title`, `body` (texte/article markdown), `video_url` (nullable), `playlist_url` (nullable), `video_urls` (text[] nullable — pour liste manuelle), `author_id`, `pinned_at`, `created_at`, `updated_at`
- RLS : SELECT public (anon+authenticated), INSERT/UPDATE/DELETE `has_role(uid,'admin')` uniquement
- GRANTs : SELECT anon + authenticated, ALL service_role, INSERT/UPDATE/DELETE authenticated

**Route `src/routes/clips.tsx`** :
- Head SEO (title/description/og) — page publique
- Deux sections empilées : "Clips Actu" puis "Playlists Clips"
- Chaque carte = titre + corps + lecteur(s) vidéo intégré(s) via `UrlEmbeds` / `VideoPlayer`
- Bouton admin "Nouvelle entrée" dans chaque section (visible si `isAdmin`)
- Édition/suppression inline (Pencil/Trash) comme sur le mur social

**Composant `src/components/clips/ClipEntryEditor.tsx`** :
- Champs : titre, corps (textarea), URL vidéo principale, ou URL playlist, ou liste manuelle d'URLs (radio "Vidéo unique / Playlist / Liste manuelle")
- Zod validation URL YouTube/Vimeo
- Mutation Supabase + toast

**Ajout au menu** `AppShell.tsx` : entrée "Clip Addict" avec l'icône `Film`.

## 3. Technique

- `youtube-embed-utils` : parseur maison (regex) qui renvoie `{ provider: 'youtube'|'vimeo', embedUrl, id, type: 'video'|'playlist' }`.
- Aucune dépendance externe ajoutée (iframe natif, pas de `react-player`).
- `link-preview` : parsing HTML léger avec regex ciblée sur `<meta property="og:*">` — pas de dépendance HTML parser.
- Migration + GRANTs + RLS admin-only en un seul batch.
- Types Supabase régénérés automatiquement après migration.
