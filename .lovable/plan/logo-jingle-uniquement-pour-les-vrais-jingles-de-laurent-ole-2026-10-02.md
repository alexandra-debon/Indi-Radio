# Logo jingle uniquement pour les vrais jingles de Laurent Oleff

## Constat
Aujourd'hui, tout titre dont l'artiste contient « Oleff » reçoit le logo jingle, même son nouveau single. Le lecteur applique la même règle par ressemblance de nom.

## Nouvelle règle
- Logo jingle affiché **seulement** si le titre ou l'artiste contient le mot « jingle » (ex. « Jingle InDi RaDio — Laurent Oleff »).
- Un titre de Laurent Oleff sans le mot « jingle » est traité comme les autres : pochette cherchée automatiquement (iTunes, etc.).
- Mot entier uniquement : « single » ne déclenche plus rien.

## Ce qui change
1. Recherche de pochette : on retire la règle « nom Oleff = jingle » et on garde uniquement le mot « jingle ».
2. Lecteur : même règle pour la détection des jingles (compteur de temps), plus de détection par le nom.
3. Mise à jour de la clé de cache des pochettes pour que le single récupère sa vraie pochette immédiatement.

## À vérifier avec toi
Les jingles de Laurent doivent bien contenir « jingle » dans leur titre ou nom d'artiste diffusé. Si certains jingles n'ont pas ce mot, il faudra les renommer dans l'outil de diffusion (sinon ils perdraient le logo).

## Détails techniques
- `src/routes/api/public/radio/artwork.ts` : `isJingle` → regex `/\bjingles?\b/i`, suppression des tests `laurent`/`oleff`.
- `src/components/radio/RadioPlayerProvider.tsx` : `isJingleTrack` sans le fuzzy laurent/oleff.
- `src/hooks/use-artwork.ts` : queryKey `v4` → `v5`.
- Vérification : appel de l'API pochette avec « Laurent Oleff – <single> » (vraie pochette) et « Laurent Oleff – Jingle » (logo).
