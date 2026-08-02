# Titres et descriptions localisés FR / EN cohérents

Objectif : que chaque page affiche dans Google un titre et une description propres à son contenu, en français sur les moteurs français et en anglais sur `?hl=en`, sans doublons ni libellés génériques.

## Ce qui ne va pas aujourd'hui

1. **Les pages de détail perdent leur vrai titre.** Le dictionnaire SEO contient des entrées « par préfixe » (`/actus/`, `/chroniques/`, `/episodes/`, `/clips/`, `/magazines/`, `/p/`, `/u/`, `/tag/`, `/emissions/`). Comme elles sont appliquées en priorité sur le titre défini par la page, toutes les chroniques partagent le snippet « Chronique — InDi RaDio », tous les épisodes « Épisode — InDi RaDio », etc. Google voit des dizaines de pages au titre identique — mauvais taux de clic et regroupement en pages dupliquées.
2. **Des pages publiques n'ont aucune version anglaise.** `/playlists`, `/playlists/<slug>`, `/coups-de-coeur`, `/artistes` ne figurent pas dans le dictionnaire : en `?hl=en` elles gardent leur titre français.
3. **Les descriptions ne sont pas homogènes** : longueurs très variables (certaines dépassent la limite affichée par Google, ~155 caractères), signature de marque parfois absente côté anglais.

## Ce qui va être fait

**A. Le contenu réel reprend la main sur les pages de détail**
Les entrées génériques par préfixe deviennent un *repli* : si la page a déjà défini son titre et sa description à partir du contenu (artiste, album, titre d'épisode, pseudo…), ils sont conservés en français et traduits en anglais par le mécanisme de traduction déjà en place. Le libellé générique ne sert plus que si la page n'a rien fourni.
Résultat : « bEss — Human · Chronique album — InDi RaDio » au lieu de « Chronique — InDi RaDio ».

**B. Gabarits localisés pour les pages de détail**
Chaque famille reçoit un gabarit FR et EN cohérent, alimenté par le contenu :
- Chronique : `<Artiste> — <Album> · Chronique album — InDi RaDio` / `Album review`
- Épisode : `<Titre de l'épisode> · <Émission> — InDi RaDio`
- Émission, actu, clip, magazine, playlist, profil, hashtag : même logique.
La description reprend l'extrait réel du contenu, tronqué proprement à ~155 caractères.

**C. Pages statiques manquantes ajoutées en FR + EN**
`/playlists`, `/coups-de-coeur`, `/artistes` et le gabarit `/playlists/<slug>`, rédigés sur le modèle des entrées existantes.

**D. Harmonisation de l'existant**
Revue de toutes les entrées : titre ≤ 60 caractères utiles avec le mot-clé en tête et la marque en fin, description entre 120 et 155 caractères, mention « 24/7 de la musique indépendante » conservée, et équivalence stricte de sens entre FR et EN.

**E. Les surcharges admin restent prioritaires**
Le panneau admin > SEO continue d'écraser tout le reste, page par page et langue par langue : rien de ce qui a été saisi à la main n'est perdu.

## Détails techniques

- `src/lib/i18n/seo-meta.ts` : ajout des entrées statiques manquantes ; `PREFIX_SEO` transformé en gabarits FR+EN marqués comme repli ; utilitaire de troncature à 155 caractères et contrôle de longueur des titres.
- `src/components/i18n/SeoLocalizer.tsx` : sur un chemin dynamique, ne plus écraser le `head()` de la route quand celui-ci fournit un titre spécifique. Ordre de priorité final : surcharge admin > `head()` de la route (traduit en EN) > gabarit de préfixe > entrée statique.
- Routes de détail (`chroniques.$slug`, `episodes.$episodeId`, `emissions.$showId`, `actus.$postId`, `clips.$clipId`, `magazines.$magazineId`, `playlists.$slug`) : `head()` aligné sur les gabarits, avec `og:title` / `og:description` / `twitter:*` identiques au titre et à la description.
- Aucun changement de base de données, de canonique, de hreflang ni de sitemap.

## Vérification

Contrôle des pages clés en FR et en `?hl=en` (titre, description, `og:*`) et vérification qu'aucun titre générique dupliqué ne subsiste sur les pages de détail.