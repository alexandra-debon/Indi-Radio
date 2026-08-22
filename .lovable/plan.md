# Corriger les liens de partage qui restent en anglais

## Problème constaté

Le bouton de partage construit l'URL à partir de l'adresse affichée dans le navigateur, puis n'ajoute `?hl=en` que si l'interface est en anglais. Il ne **retire jamais** un `hl=en` déjà présent dans l'adresse : si la page a été ouverte une fois en anglais (ou via un lien anglais), le paramètre reste collé à l'URL et tous les partages suivants pointent vers la version anglaise, même en mode français.

Vérifié dans `src/lib/og-lang.ts` : `withHl()` renvoie l'URL telle quelle dès que la langue est `fr`, et sort aussi immédiatement si un `hl=` est déjà là.

## Ce qui sera fait

1. **Normaliser l'URL partagée sur la langue réellement active**
   - Nouvelle logique dans `src/lib/og-lang.ts` : supprimer tout `hl=` existant de l'URL, puis ajouter `hl=en` uniquement si la langue active est l'anglais. En français, le lien partagé est l'URL nue, sans paramètre de langue.
   - Nettoyer au passage les paramètres de suivi parasites (`utm_*`, `fbclid`, `gclid`) pour que le lien copié reste propre.

2. **Appliquer cette normalisation partout où un lien est partagé**
   - `src/components/share/ShareButton.tsx` : lien copié, Facebook, LinkedIn, WhatsApp, Telegram, Reddit, e-mail et partage natif utiliseront tous l'URL normalisée.

3. **Éviter que `hl=en` traîne dans la barre d'adresse en mode français**
   - `src/components/i18n/LangUrlSync.tsx` : s'assurer que la synchronisation retire bien `hl` dès que la langue active repasse en français, y compris après hydratation depuis le profil ou le stockage local.

4. **Vérification**
   - Contrôle en aperçu : ouvrir une page avec `?hl=en`, basculer en FR, puis copier le lien — il ne doit plus contenir `hl`. Puis basculer en EN et vérifier que `?hl=en` est bien présent.

## Détails techniques

`withHl(url, lang)` devient une fonction de canonisation de la langue (`shareUrlForLang`) : parsing via `URL`, `searchParams.delete("hl")`, puis `set("hl", "en")` si besoin, hash préservé. `resolveUrl()` de `ShareButton` reste inchangé, seule la sortie est normalisée. Aucun changement côté `head()`/SSR : les métadonnées OG continuent de lire `hl` depuis la recherche de route.
