Intégrer le snippet Plausible Analytics dans le header global de l'application via le fichier `src/routes/__root.tsx`.

## Ce qui sera fait
- Ajouter le script asynchrone Plausible (`pa-TX5XYkmAdUGR_zI1ikO77.js`) dans le tableau `scripts` du `head()` de la route racine.
- Ajouter le script inline d'initialisation `window.plausible` juste après.
- Conserver le commentaire « Privacy-friendly analytics by Plausible » dans le code source pour la documentation.
- Placer les scripts en fin du tableau `scripts`, après le JSON-LD existant, pour ne pas bloquer le rendu.

## Fichier concerné
- `src/routes/__root.tsx` : ajout de deux entrées dans le tableau `head().scripts` (script externe + script inline).

## Non inclus
- Pas d'exclusion native/Capacitor : le snippet Plausible, sans cookie, est chargé globalement. Si tu veux le désactiver sur l'app mobile native, dis-le-moi.
- Pas d'événements personnalisés pour le moment : seul le chargement de page standard sera mesuré.
