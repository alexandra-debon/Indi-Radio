## Problème

Sur Safari iPhone, quand l'utilisateur **n'est pas connecté** et verrouille son écran, la musique s'arrête. Quand il est connecté, elle continue.

## Cause racine

iOS Safari n'autorise la lecture audio en arrière-plan (écran verrouillé) **que si l'onglet a des métadonnées MediaSession valides** (`title` + `artist` au minimum). Sans métadonnées, iOS considère l'audio comme un « son de notification » et le coupe dès le verrouillage.

Dans `RadioPlayerProvider.tsx` :

```ts
if (!currentTrack) {
  navigator.mediaSession.metadata = null;   // ← iOS coupe l'audio au lock
  return;
}
```

`currentTrack` vient d'une requête sur la table `track_history`. Les politiques RLS restreignent probablement la lecture aux utilisateurs authentifiés → **anon = `currentTrack` reste `null` = pas de métadonnées = coupure au verrouillage**. Les utilisateurs connectés voient la piste → métadonnées présentes → lecture continue.

## Plan

### 1. Fallback MediaSession inconditionnel (fix principal)

Dans `src/components/radio/RadioPlayerProvider.tsx` (bloc `useEffect` lignes 330-353), remplacer le `metadata = null` par un fallback station :

- `title` = `"InDi RaDio — En direct"`
- `artist` = `"Radio 100% musique indépendante"`
- `album` = `"InDi RaDio"`
- `artwork` = logo InDi RaDio (import statique depuis `src/assets/indi-radio-logo.png`, en 512/256/128)

Comme ça, dès que l'utilisateur appuie sur play — connecté ou non — MediaSession a de vraies métadonnées et iOS maintient la lecture au verrouillage. Quand `currentTrack` arrive plus tard, on l'écrase avec les vraies infos.

### 2. Vérifier l'accès `anon` à `track_history`

Contrôler via une requête SQL en lecture seule si la policy SELECT couvre `anon`. Si non, ajouter :

```sql
GRANT SELECT ON public.track_history TO anon;
CREATE POLICY "Public read track_history"
  ON public.track_history FOR SELECT TO anon USING (true);
```

Bénéfice secondaire : les utilisateurs non connectés voient aussi le titre en cours dans le mini-player et sur l'écran de verrouillage. La lecture en arrière-plan reste garantie par le point 1 même si cette étape échoue.

### 3. Durcissement (petit)

- Ajouter `playsInline` sur l'élément `<audio>` (ligne 662) pour bien signaler à iOS un lecteur média inline (pas d'incidence UI, l'élément est masqué mais ça sécurise le comportement).

## Vérification

- Build passe (typecheck / lint).
- Test manuel Safari iPhone en mode privé (non connecté) : appuyer play → verrouiller l'écran → la musique doit continuer et les contrôles doivent apparaître sur l'écran de verrouillage avec le logo.

## Zone technique

Fichier modifié :
- `src/components/radio/RadioPlayerProvider.tsx` (fallback MediaMetadata + `playsInline`).

Migration éventuelle :
- Policy + GRANT `SELECT` anon sur `public.track_history` uniquement si l'audit RLS confirme qu'anon n'a pas accès aujourd'hui.
