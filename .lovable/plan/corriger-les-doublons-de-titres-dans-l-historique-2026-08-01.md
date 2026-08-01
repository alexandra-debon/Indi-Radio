# Corriger les doublons de titres dans l'historique

## Ce qui se passe réellement

Les données confirment le problème : par exemple « Different Pulses » d'Asaf Avidan est enregistré 4 fois à `08:41:27.297`, `.297`, `.298`, `.301` — soit 4 insertions en moins de 4 millisecondes. Ce n'est donc pas la radio qui rediffuse le titre : ce sont plusieurs appareils/onglets qui déclenchent en même temps le relevé du titre en cours.

Le relevé (`scrapeCurrentTrack`) lit le dernier titre enregistré, puis insère si le titre a changé. Quand 4 auditeurs déclenchent ce relevé à la même seconde, les 4 lisent « ancien titre » avant que l'un d'eux n'ait inséré, et les 4 insèrent. Rien en base n'empêche l'insertion en double.

## Correction

1. **Verrou côté base de données (la vraie correction)**
   Déplacer l'insertion dans une fonction base de données qui prend un verrou exclusif avant de vérifier le dernier titre et d'insérer. Deux appels simultanés sont alors traités l'un après l'autre : le second voit que le titre vient d'être enregistré et n'insère rien.
   Garde-fou supplémentaire : ignorer toute insertion d'un titre identique au dernier enregistré datant de moins de 60 secondes.

2. **Nettoyage de l'historique existant**
   Supprimer les doublons déjà en base (mêmes titre + artiste enregistrés à quelques secondes d'intervalle), en gardant la ligne la plus ancienne de chaque groupe et en rattachant les « j'aime » éventuels à cette ligne conservée, pour ne perdre aucun like ni compteur de chart.

3. **Filet de sécurité à l'affichage (tous les supports)**
   Sur la page En direct (web, PWA, apps iOS/Android — même code), filtrer à l'affichage les lignes consécutives ayant le même titre + artiste, afin qu'un doublon résiduel ne soit jamais visible.

## Détails techniques

- Migration : fonction `record_current_track(title, artist)` en `SECURITY DEFINER`, avec `pg_advisory_xact_lock` + contrôle « même titre/artiste dans les 60 dernières secondes », plus une requête unique de dédoublonnage de `track_history` (repointage préalable de `track_likes.track_history_id`).
- `src/lib/track-scrape.functions.ts` : remplacer le `select` + `insert` par un appel `rpc('record_current_track', …)`.
- `src/routes/index.tsx` : dédoublonnage consécutif de la liste `track-history-short` avant rendu (limite portée à ~20 puis coupée à 8 après filtrage).
- Aucun changement de design ; les charts (`chart_week`, `chart_all_time`) profitent mécaniquement du nettoyage.
