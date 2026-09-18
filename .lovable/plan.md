# Ordre du menu : RéDaK'Village, InDi TeeVi et Magazine regroupés sous le Blog

## Ce qui sera fait

Le menu principal est défini par une seule liste dans le composant de navigation. On y déplace trois entrées existantes, sans rien renommer ni recréer :

- **RéDaK'Village** passe juste après **Blog InDi ArT CulTuRe** (Actus).
- **InDi TeeVi** passe juste après **RéDaK'Village**.
- **Magazine** passe juste après **InDi TeeVi**.

Les autres entrées gardent leur place relative actuelle (Émissions, Podcasts, Coups de cœur, Chroniques, Clip Addict, Galerie Artistes, Playlists, Top 25, Top membres, Top podcasts & chroniques, Dédicaces, Soumission artistes, À propos, Contact).

## Nouvel ordre du menu

```text
1  Ma page perso        (visible quand connecté — inchangé, en tête)
2  En direct            /
3  Blog InDi ArT CulTuRe /actus
4  RéDaK'Village        /redak-village   <- déplacé
5  InDi TeeVi           /indi-teevi      <- déplacé
6  Magazine             /magazines       <- déplacé
7  Émissions            /emissions
8  Podcasts             /podcasts
9  Coups de cœur        /coups-de-coeur
10 Chroniques           /chroniques
11 Clip Addict          /clips
12 Galerie Artistes     /artistes
13 Playlists InDi       /playlists
14 Top 25               /chart
15 Top membres          /top-users
16 Top podcasts & chroniques /top
17 Dédicaces            /dedicaces
18 Soumission artistes  /soumission-artistes
19 À propos             /about
20 Contact              /contact
```

## Pourquoi l'architecture n'est pas touchée

- Chaque entrée reste le même objet : même adresse, même texte traduit (français et anglais), même icône, même infobulle de référencement. On change uniquement la position de trois lignes dans la liste.
- Aucune page, aucun fichier de route, aucune URL n'est déplacé ou renommé : les liens déjà partagés, les favoris, le plan du site et les aperçus réseaux restent valides.
- Le menu latéral et le menu téléphone utilisent la même liste : les deux affichent automatiquement le nouvel ordre, sans modification séparée.
- Les liens de pied de page, le bouton administrateur, le menu administrateur et les accès au profil sont des listes distinctes : ils ne changent pas.

## Détails techniques

- Fichier concerné : le composant de navigation principal (`src/components/AppShell.tsx`), la liste `NAV` (une seule source de vérité pour le menu).
- Trois objets déplacés dans l'ordre : `nav.village` (Feather), `nav.teevi` (Tv), `nav.magazines` (BookOpen), insérés entre `nav.news` et `nav.shows`.
- Aucun changement de traduction, d'icône, de balise de partage ou de règle d'accès.

## Vérifications

- Le menu affiche le nouvel ordre, en français comme en anglais, sur ordinateur et sur téléphone.
- Les trois entrées déplacées mènent toujours aux bonnes pages, l'entrée active est bien surlignée, et le menu téléphone se referme après un clic.
- L'indicateur « page courante » de Magazine / RéDaK'Village / InDi TeeVi continue de fonctionner depuis leurs pages enfants (article, vidéo, magazine).
- Aucun avertissement de construction et aucune erreur dans la console.
