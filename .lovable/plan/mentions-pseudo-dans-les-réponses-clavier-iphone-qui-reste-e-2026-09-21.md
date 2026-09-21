# Mentions @pseudo dans les réponses + clavier iPhone qui reste en AZERTY

## Diagnostic (confirmé par lecture du code)

**Clavier qui bascule en américain (QWERTY)** — cause racine identifiée :
`src/lib/i18n/index.tsx` (l.67 et l.82) réécrit `document.documentElement.lang = "fr" | "en"`
à chaque changement de langue, et le HTML part de `lang="fr"` (`src/routes/__root.tsx` l.287).
Sur iPhone, quand plusieurs claviers sont installés (AZERTY + QWERTY), iOS choisit la
disposition du clavier d'après la langue déclarée de la page/du champ. Interface en anglais →
iOS impose le clavier américain, et la bascule peut se reproduire en cours de frappe quand la
langue est resynchronisée (profil, paramètre `?hl=`). Aucun champ de saisie ne déclare de
`lang` propre : tous héritent de `<html lang>`.

**Tag @pseudo en réponse à une publication** — le champ de réponse du mur utilise déjà
`MentionTextarea` (qui gère l'autocomplétion @ et #), mais deux fragilités sur iPhone :
la liste de suggestions s'ouvre *sous* le champ (`top-full`), donc souvent masquée par le
clavier quand le champ est bas à l'écran, et l'insertion par tap peut être prise de vitesse
par la fermeture au `blur`. Sur un iPhone SE, la suggestion est donc souvent invisible ou
insélectionnable — d'où l'impression que « le tag ne marche pas ».

## Ce qui sera fait

1. **Clavier stable en AZERTY** : ajouter un attribut `lang` explicite sur les champs de
   texte libre, indépendant de la langue d'interface. Centralisé dans
   `src/components/ui/textarea.tsx` et `src/components/ui/input.tsx` (valeur par défaut
   `fr`, surchargeable par prop) — couvre automatiquement le mur, les commentaires,
   RéDaK'Village, TeeVi, le chat et tous les formulaires futurs. `document.documentElement.lang`
   reste dynamique (nécessaire au SEO/hreflang, il n'est pas hérité par un champ qui a son
   propre `lang`).
2. **Attributs de saisie iOS stabilisés** sur ces champs (`autoCapitalize`, `autoCorrect`,
   `spellCheck`) pour qu'ils ne varient pas d'un rendu à l'autre et ne déclenchent pas de
   réinitialisation du clavier.
3. **Suggestions @/# utilisables sur petit écran** : la liste s'ouvre au-dessus du champ
   quand il est dans la moitié basse de l'écran (au lieu d'être cachée sous le clavier),
   et le tap sur une suggestion insère la mention de façon fiable (sélection au `pointerdown`,
   fermeture différée au blur déjà présente conservée).
4. **Vérification** : typecheck `bunx tsgo --noEmit -p tsconfig.json`, puis Playwright en
   viewport iPhone SE (375×667) : ouvrir une réponse à une publication, taper `@jo`, vérifier
   que la liste apparaît au-dessus du champ, sélectionner un pseudo, confirmer l'insertion
   `@pseudo ` sans perte de focus. Vérifier aussi que le champ rendu porte bien `lang="fr"`.

## Détails techniques

- `src/components/ui/textarea.tsx` / `input.tsx` : `lang = "fr"` par défaut dans les props
  (respecte la mémoire projet : pas de chaîne FR visible — `lang` est un attribut, pas du texte).
- `MentionTextarea.tsx` : détection de position du champ via `getBoundingClientRect()` au
  moment de l'ouverture ; classe `bottom-full mb-1` (au-dessus) vs `top-full mt-1` (en dessous)
  ; remplacer `onMouseDown` par `onPointerDown` pour fiabiliser le tap iOS.
- Aucune migration base de données, aucun changement d'architecture, aucune chaîne FR brute
  ajoutée au JSX (les textes éventuels passent par les dictionnaires i18n).
- Limite connue : un utilisateur iOS qui n'a *que* le clavier anglais installé garde son
  clavier — `lang` n'installe pas de clavier, il empêche la bascule non désirée.
