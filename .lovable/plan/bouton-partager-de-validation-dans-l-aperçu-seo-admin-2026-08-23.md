# Bouton “Partager” de validation dans l’aperçu SEO admin

## Objectif

Dans la page admin **Aperçu SEO — FR / EN**, permettre de vérifier en un clic ce qu’une plateforme (Facebook, WhatsApp, LinkedIn…) verra pour une page donnée, sans passer par un vrai partage.

## Ce qui est ajouté

Sur chaque panneau de langue (FR et EN) de chaque route :

- Un bouton **Partager / Copier le lien** qui génère l’URL de partage **exacte**, produite par la même logique que le bouton de partage public de l’app : URL nue en français, `?hl=en` en anglais, paramètres de tracking retirés. Un clic copie l’URL dans le presse-papiers avec confirmation.
- Sous le bouton, un **bloc “Aperçu attendu”** façon carte sociale : l’URL de partage, le titre attendu (`og:title`), la description attendue (`og:description`), l’image de partage et `og:locale`, avec les compteurs de caractères déjà présents.
- Des **raccourcis de validation** vers les debuggers officiels, pré-remplis avec l’URL générée : Facebook Sharing Debugger, LinkedIn Post Inspector, et une ouverture directe de la page.
- Pour les routes “préfixe dynamique”, un champ permettant de saisir un slug réel afin d’obtenir l’URL de partage exacte de cet article plutôt qu’un exemple générique.

## Détails techniques

- Nouveau composant `src/components/admin/SeoShareRow.tsx`, utilisé par `LangPanel` dans `src/routes/_authenticated/admin.seo-preview.tsx`.
- L’URL est construite avec `withHl()` de `src/lib/og-lang.ts` (source unique de vérité, identique à `ShareButton.tsx`) à partir du domaine canonique `https://www.radio.indi-art-culture.com`.
- Copie via `navigator.clipboard` avec repli `document.execCommand`, retour utilisateur via `sonner`.
- Aucun changement au bouton de partage public ni aux balises `head()` : la page reste un outil de contrôle en lecture seule (`noindex`, réservée aux admins).
