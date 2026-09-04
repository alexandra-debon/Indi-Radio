# Radio Mode — écran verrouillé esthétique

Oui, c'est tout à fait possible. Un mode plein écran, très sombre, centré sur la musique.

## Ce que ça donne

Un bouton **Radio Mode** (icône + libellé) dans le lecteur / l'en-tête. Au clic, l'app bascule sur un écran dédié :

- Fond noir profond, dégradé très sombre, aucune barre de navigation.
- Logo InDi RaDio en haut, discret.
- Au centre : la pochette du morceau en cours, posée dans un **grand rond jaune** qui pulse et projette des « éruptions solaires » (arcs de lumière irréguliers) synchronisées au niveau audio réel du flux.
- Sous la pochette : nom de l'artiste et titre en cours.
- Un seul contrôle : **Play / Pause**, gros bouton jaune circulaire.
- En dessous : les **3 derniers titres joués**, en liste sobre (heure, artiste — titre).
- En bas : bouton **Déverrouiller** (cadenas) pour revenir à l'application normale.

Rien d'autre n'est cliquable : pas de menu, pas de mur social, pas de volume. L'écran reste allumé tant que la lecture est active (quand le navigateur le permet).

## Détails techniques

- Nouvelle route `src/routes/radio-mode.tsx` (plein écran, hors `AppShell`), avec `head()` propre (titre/description/og FR-EN).
- Le son n'est jamais coupé : la lecture continue via le `RadioPlayerProvider` existant, la route ne fait que changer l'affichage.
- Les éruptions solaires utilisent `subscribeLevel` déjà exposé par le provider (analyser Web Audio), rendues dans un `<canvas>` : anneau jaune + langues de plasma dont la longueur suit le niveau, avec repli sur une animation douce si l'analyser renvoie 0 (iOS).
- Historique : requête `track_history` (3 dernières lignes), réutilise la logique déjà en place sur la page d'accueil.
- Pochette : hook `useArtwork` existant, fallback logo.
- Bouton d'entrée « Radio Mode » ajouté dans `MiniPlayer.tsx` et sur le lecteur de la page d'accueil ; sortie via le bouton Déverrouiller (et touche Échap sur desktop).
- Couleurs uniquement via les tokens existants (`--primary` jaune, fond sombre dédié ajouté dans `src/styles.css`), aucune couleur en dur.
- Wake Lock API pour garder l'écran allumé, ignorée silencieusement si non supportée.
- Libellés FR/EN via le système i18n existant.
