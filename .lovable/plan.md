# Plan — App mobile Indi Radio (iOS + Android)

On enveloppe l'app web actuelle avec **Capacitor** : une seule base de code, deux binaires natifs publiables sur l'App Store et Google Play.

## 1. Base Capacitor

- Ajout des dépendances `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
- Fichier `capacitor.config.ts` à la racine :
  - `appId`: `com.indiartculture.radio`
  - `appName`: `Indi Radio`
  - `webDir`: `dist`
  - `server.url` pointant vers `https://radio.indi-art-culture.com` en production (l'app native charge le site publié → mises à jour instantanées sans repasser par le store pour la partie web).
  - Fallback local `webDir` pour le mode hors-ligne / dev.
- Scripts `bun run cap:sync`, `cap:ios`, `cap:android` dans `package.json`.
- README court expliquant comment builder localement (Xcode / Android Studio requis de ton côté pour signer et publier — Lovable ne peut pas soumettre aux stores à ta place).

## 2. Lecture audio en arrière-plan + contrôles lockscreen

Plugin `@capgo/capacitor-native-audio` **non** — il ne gère pas les streams Icecast + lockscreen correctement. On part sur :
- Plugin `capacitor-music-controls-plugin` (ou `@capgo/native-audio` selon dispo) pour exposer titre / artiste / pochette dans le centre de contrôle iOS et la notification média Android.
- Sur iOS : ajout de la capability `Background Modes → Audio, AirPlay, and Picture in Picture` dans `ios/App/App/Info.plist` (généré automatiquement, documenté dans le README pour Xcode).
- Sur Android : service `MediaSessionCompat` via le plugin, notification persistante pendant la lecture.
- Le `<RadioPlayerProvider>` existant détecte l'environnement natif (`Capacitor.isNativePlatform()`) et pousse les métadonnées du titre courant (déjà présentes via `track_history`) vers les contrôles natifs à chaque changement.

## 3. Notifications push

- Plugin `@capacitor/push-notifications` (APNs sur iOS, FCM sur Android).
- Nouvelle table `device_tokens` (user_id, platform, token, updated_at) + RLS : l'utilisateur ne voit / modifie que ses propres tokens.
- Server function `registerDeviceToken` protégée par `requireSupabaseAuth` qui upsert le token à chaque ouverture de l'app.
- Server function `sendPushToUser` (service role, admin uniquement) qui appelle APNs / FCM depuis le backend.
- Déclencheurs automatiques :
  - Nouvelle actu Indi Rézo → push à tous les abonnés inscrits.
  - Dédicace validée → push à l'auteur de la demande.
  - Nouvelle émission qui commence → push aux abonnés de l'émission (optionnel v1.1).
- Écran `/profile` : toggles par catégorie (actus / dédicaces / émissions) — table `notification_preferences` déjà présente, on la réutilise.
- **Requiert de ton côté** : un compte Apple Developer ($99/an) pour créer la clé APNs, et un projet Firebase (gratuit) pour la clé FCM Android. Je te lister les valeurs exactes à me fournir comme secrets (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `FCM_SERVER_KEY`) une fois qu'on y sera.

## 4. Partage natif

- Plugin `@capacitor/share`.
- Bouton "Partager" ajouté sur : titre en cours (mini-lecteur), fiche actu, fiche podcast, fiche émission, page chronique.
- Sur mobile natif → feuille de partage système (iMessage, WhatsApp, Instagram, etc.).
- Sur web → fallback vers `navigator.share` puis, en dernier recours, copie du lien dans le presse-papier avec toast.

## 5. Icône + splash screen personnalisés

- Génération à partir du logo Indi Radio existant :
  - Icône : 1024×1024 PNG, exportée aux 20+ tailles requises par iOS et Android via `@capacitor/assets`.
  - Splash : fond noir avec le logo carré centré + le wordmark "Indi Radio" en dessous, jaune sur noir (identité de la radio). Généré en versions light / dark, portrait / paysage.
- Un seul script `bun run cap:assets` régénère tout à partir de `resources/icon.png` et `resources/splash.png`.

## 6. Adaptations UI mobiles

- Safe areas iOS (encoche + Dynamic Island) : ajout des variables `env(safe-area-inset-*)` au header et au mini-lecteur.
- Désactivation du zoom pinch sur les pages non-média (viewport meta).
- Empêcher le bounce/overscroll sur iOS avec `WKWebViewConfiguration` (config Capacitor).
- Bouton "Installer" / bandeau PWA existant masqué en environnement natif.

## Détails techniques

- **Fichier `src/lib/native.ts`** : helper unique `isNative()`, `getPlatform()`, wrappers autour des plugins pour que le reste du code reste isomorphe.
- **Server functions push** : `src/lib/push.functions.ts` (registration côté user) et `src/lib/push-admin.functions.ts` (envoi côté admin, protégé par `has_role('admin')`).
- **Migration** : table `device_tokens` avec GRANT / RLS complets (INSERT + UPDATE + DELETE réservés à `auth.uid() = user_id`, service_role total pour l'envoi).
- **Secrets à ajouter (dans un second temps)** : `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `FCM_SERVER_KEY` — je te le demanderai au moment de câbler l'envoi réel des pushs.
- **Ce que tu devras faire de ton côté (une seule fois)** :
  1. Installer Xcode (Mac) et Android Studio.
  2. Cloner le repo Lovable en local, lancer `bun install && bun run build && bun run cap:sync`.
  3. Ouvrir `ios/App/App.xcworkspace` dans Xcode → signer avec ton compte Apple Developer → archive → soumettre à App Store Connect.
  4. Ouvrir `android/` dans Android Studio → générer un bundle `.aab` signé → soumettre à Google Play Console.
  5. Je te fournirai un README détaillé étape par étape.

## Découpage en itérations

Je propose de livrer en **3 lots** pour que tu puisses tester au fur et à mesure :

- **Lot 1 (ce prochain tour)** : Capacitor installé + configuré, icône + splash, safe areas, script de build, README. Tu pourras déjà générer un binaire iOS et Android qui charge le site radio.
- **Lot 2** : Lecture audio arrière-plan + contrôles lockscreen + partage natif.
- **Lot 3** : Notifications push (table, server functions, UI de préférences, câblage APNs/FCM une fois les secrets fournis).

Je démarre par le **Lot 1** dès que tu valides ce plan. Réponds "ok" ou dis-moi ce qu'il faut changer.
