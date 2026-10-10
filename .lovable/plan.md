# Partages Facebook (et autres réseaux) : correction complète

## Ce que l'audit a montré

Le site en ligne envoie bien à Facebook le titre et l'image de chaque page. J'ai vérifié le blog, les chroniques, les clips, les émissions, les magazines, RéDaK'Village, les pages artistes et la chanson en cours. Le problème vient donc du bouton, pas des pages.

1. **Cause principale (sur téléphone) :** le bouton « Facebook » ouvre un lien de partage Facebook. Sur iPhone et Android, l'application Facebook récupère ce lien, s'ouvre sur ton fil d'actualité et oublie ce qu'on voulait partager. C'est exactement ce que tu vois : Facebook s'ouvre, mais sans rien à publier.
2. **Dans l'app des stores :** le partage passe par la feuille du téléphone, mais il envoie le texte et le lien ensemble. Sur Android, Facebook lit mal ce mélange et peut publier sans aperçu.
3. **Image en double :** sur certaines pages (Blog, Podcasts, Émissions, RéDaK'Village), une deuxième image, celle par défaut du site, est envoyée en plus. Facebook peut choisir la mauvaise.
4. **Chroniques :** la pochette est envoyée dans un format que certains réseaux lisent mal, et elle n'est pas recadrée au bon format.
5. **Pages artistes sans photo :** elles affichent l'image générale du site au lieu de la bannière ou de l'avatar de l'artiste.

## Ce qui va changer

- **Facebook sur téléphone (site et app) :** le bouton ouvre la feuille de partage du téléphone, avec seulement le lien de la page. Tu choisis Facebook, et la fenêtre de publication s'ouvre avec la miniature, le titre et la description. Pour X, WhatsApp, Messenger et les autres apps, c'est la même feuille.
- **Si le téléphone n'a pas de feuille de partage** (rare) : le lien est copié automatiquement, puis Facebook s'ouvre avec le message « Lien copié, colle-le dans ta publication ».
- **Sur ordinateur :** rien ne change. La petite fenêtre Facebook s'ouvre avec l'aperçu.
- **Menu Partager identique partout** (site, app iPhone, app Android) : Facebook, X, LinkedIn, WhatsApp, Telegram, E-mail, Copier le lien, plus « Autres apps… » sur téléphone.
- **Une seule image par page :** l'image par défaut du site n'est plus ajoutée quand la page a déjà la sienne.
- **Chroniques et pages artistes :** la pochette, l'avatar ou la bannière sont envoyés au bon format (1200×630, JPEG).
- La chanson en cours, les émissions, les podcasts, le blog, le magazine et RéDaK'Village gardent leurs aperçus actuels, qui sont corrects.

## Vérifications avant de te rendre la main

- Lecture de chaque type de page comme le fait le robot Facebook : un seul titre et une seule image, et l'image s'ouvre bien.
- Test sur un iPhone simulé : le bouton Facebook ouvre bien la feuille de partage avec le bon lien, et la copie de secours marche.
- Test sur ordinateur : la fenêtre Facebook s'ouvre avec le bon lien.
- Après la publication : un contrôle sur le site en ligne. Le vrai envoi sur Facebook depuis ton téléphone reste à faire de ton côté, car je ne peux pas publier sur Facebook.

## Détails techniques

- `src/components/share/ShareButton.tsx` :
  - Ajouter la détection du téléphone (`isNative()` ou pointeur tactile avec `navigator.share`).
  - Sur téléphone, le bouton Facebook appelle `shareNative({ url })`, avec le lien seul et sans texte. Il utilise `@capacitor/share` dans l'app et `navigator.share` dans le navigateur.
  - Ajouter « Autres apps… » qui appelle `shareNative({ title, text, url })`.
  - Le menu s'affiche aussi dans l'app native : on supprime le bouton qui ouvrait directement la feuille système.
  - Secours : `clipboard.writeText(url)`, un message, puis l'ouverture de `https://www.facebook.com/`.
  - Sur ordinateur, on garde `sharer.php` dans une fenêtre popup.
- `src/lib/native.ts` : ne plus passer `text` ou `title` quand ils sont vides, pour que l'envoi Android contienne seulement l'URL.
- `src/routes/__root.tsx` / `src/lib/og-tags.ts` : retirer l'`og:image:secure_url` de secours de la racine quand une page enfant définit `og:image`. On vérifie le résultat pour `/actus`, `/podcasts`, `/emissions` et `/redak-village`.
- Fiche chronique et `/u/$username` : passer l'image par `facebookSafeImage(..., { width: 1200, height: 630 })`. Pour les artistes, on utilise la bannière, sinon l'avatar, sinon l'image du site.
- Contrôle final avec `curl -A facebookexternalhit` sur chaque type de page, et Playwright en profil iPhone avec un `navigator.share` simulé.
