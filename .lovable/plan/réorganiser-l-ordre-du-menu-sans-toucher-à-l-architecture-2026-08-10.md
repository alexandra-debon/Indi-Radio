# Réorganiser l’ordre du menu sans toucher à l’architecture

## Ce qui sera fait

- Modifier uniquement l’ordre des entrées du menu principal dans le composant de navigation existant.
- Conserver chaque URL, son identifiant de route, ses traductions, ses icônes et ses métadonnées SEO.
- Ne pas déplacer, renommer ou recréer les fichiers de routes.
- Laisser les liens de pied de page, le bouton administrateur et les accès au profil indépendants du nouvel ordre.

## Vérifications

- Vérifier que tous les liens du menu correspondent toujours à des pages existantes.
- Vérifier la navigation en français et en anglais, ainsi que la conservation du paramètre `hl`.
- Vérifier l’état actif d’une page et la fermeture du menu mobile après sélection.
- Vérifier que les accès authentifiés et administrateur ne sont pas affectés.

## Risque

Un simple changement d’ordre dans la liste du menu ne perturbe pas l’architecture de l’application : il change uniquement l’affichage et l’ordre de navigation. Les problèmes apparaîtraient seulement si l’on modifiait les chemins, les noms de fichiers de routes ou la structure des layouts, ce qui ne sera pas fait.

## À préciser pour l’exécution

La modification pourra être appliquée dès que l’ordre souhaité des pages sera fourni, par exemple sous la forme d’une liste de haut en bas.

&nbsp;

Réorganise alors simplement de cette façon :

On conserve le live en 1 

Actus - InDi ReZo toujours en 2 

Émissions et animateurs toujours en 3

Podcasts en 4 

Magazine en n 5 

Coups de cœur en 6

Les chroniques album en 6

Clip addict en 7

Galerie Artistes en 8

Playlists InDi en 9

Chart auditeurs en 10

Top utilisateurs en 11

Top chroniques et emmissions en 12

Dédicaces 13

Soumissions artistes en 14

À propos 15

Contact 16

&nbsp;

&nbsp;