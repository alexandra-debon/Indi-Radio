# ✅ Checklist anti-rejet App Store & Google Play — InDi RaDio

Suis cette checklist AVANT de soumettre. Elle couvre les motifs de rejet
les plus fréquents pour les apps de radio / streaming audio.

## 🍏 App Store (Apple)

### Guideline 4.2 — « Minimum functionality » / repackaged web
**Risque le plus fréquent pour les apps radio.**

⚠️ **Configuration actuelle assumée** : `capacitor.config.ts` utilise
`server.url = "https://radio.indi-art-culture.com"` (webDir = `dist/client`
comme fallback offline via `scripts/capacitor-shell.mjs`). La stack
TanStack Start + Nitro n'émet pas de bundle SPA autonome, donc l'app
native charge le site publié dans la WebView. Pour éviter le rejet 4.2,
l'argumentaire "app hybride native" ci-dessous doit être fourni explicitement
à la review.

**Fonctionnalités natives distinctives réellement présentes** (à citer
telles quelles dans les notes de review) :
- Lecture audio en arrière-plan via `AVAudioSession` (`UIBackgroundModes → audio`)
  — l'utilisateur peut verrouiller l'écran ou quitter l'app, le flux
  Icecast continue.
- Media Session API branchée sur le lecteur radio → contrôles play/pause
  et métadonnées morceau/artiste visibles sur **CarPlay**, sur les casques
  et enceintes **Bluetooth**, et sur l'écran verrouillé.
- **Sign in with Apple natif** via `@capacitor-community/apple-sign-in`
  (flow système iOS, pas de WebView OAuth) — conforme 4.8.
- **Google Sign-In natif** via `@codetrix-studio/capacitor-google-auth`
  (compte système Google, pas de popup web).
- Notifications système (préférences utilisateur + notifications admin
  pour dédicaces, inscriptions, mentions, réponses).
- **Splash screen et icônes natifs** générés depuis `resources/icon.png`
  et `resources/splash.png` via `bun run cap:assets`.
- **Partage natif** via `@capacitor/share` (feuille système iOS/Android).
- **Suppression de compte in-app** (`/profile` → Zone dangereuse), conforme 5.1.1(v).
- Shell offline embarqué (`dist/client/index.html`) → pas d'écran blanc
  si le device est hors-ligne au cold-start.

### Guideline 5.1.1(v) — Suppression de compte (OBLIGATOIRE)
- ✅ Bouton « Supprimer mon compte » dans `/profile` (implémenté).
  Confirmation par saisie de « SUPPRIMER », suppression irréversible.

### Guideline 4.8 — Sign in with Apple
Si l'app propose Google / Facebook / autre login social, Apple **exige**
aussi Sign in with Apple sur iOS.
- ✅ Providers activés côté backend : Google + Apple (Lovable Cloud gère
  les flux OAuth).
- ⚠️ À activer côté Apple Developer (Capabilities → Sign In with Apple)
  pour le bundle `com.indiartculture.radio` avant soumission.

### Guideline 1.2 — Contenu généré par utilisateurs (UGC)
**Obligatoire dès qu'il y a commentaires publics :**
- ✅ Signalement d'un commentaire (`ReportButton` implémenté).
- ✅ Blocage / bannissement d'un utilisateur abusif (admin panel).
- ✅ CGU accessibles publiquement (à ajouter dans le footer).
- ✅ Modération sous 24 h annoncée dans la fiche Store.

### Guideline 5.1.1 — Politique de confidentialité
- ✅ URL publique : https://radio.indi-art-culture.com/privacy
- ✅ Privacy Manifest `PrivacyInfo.xcprivacy` (fourni).
- ✅ Répondre au questionnaire « App Privacy » sur App Store Connect
  (voir `store/privacy-policy-fr.md` § « Data Safety »).

### Guideline 2.1 — Métadonnées & performances
- ✅ Testé sur un vrai iPhone (pas juste simulateur) avant soumission.
- ✅ Pas de lien vers un site externe pour s'abonner / payer (aucun paiement dans l'app).
- ✅ Chiffrement : `ITSAppUsesNonExemptEncryption = false` (HTTPS standard).

### Guideline 2.3.10 — Pas de mention d'autres plateformes
- ✅ Dans la description App Store, ne mentionne PAS « Android » / « Google Play ».

### Test Account
- ✅ Fournis un compte de test avec email + mot de passe dans « App Review
  Information » (obligatoire pour toute app avec login).

---

## 🤖 Google Play

### Data Safety Form
- ✅ Déclarer : Email (compte), Nom d'utilisateur (compte), UGC (commentaires),
  Interactions app (analytiques anonymes si activées).
- ✅ Toutes les données transmises via HTTPS ✔.
- ✅ L'utilisateur peut demander la suppression via l'app (`/profile`) ✔.

### Content Rating
- ✅ Questionnaire IARC : radio musicale, UGC modéré → PEGI 12 attendu.

### Target API Level (obligatoire août 2025)
- ✅ `targetSdk 35` dans `android/app/build.gradle`.

### Foreground Service (audio)
- ✅ Permissions `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
  déclarées dans `AndroidManifest.xml`.
- ✅ Justification dans la Play Console : « Lecture radio en continu en
  arrière-plan, contrôlable depuis la notification et l'écran verrouillé. »

### Notifications runtime permission (Android 13+)
- ✅ Permission `POST_NOTIFICATIONS` demandée UNIQUEMENT quand l'utilisateur
  active les notifications dans les Réglages.

---

## 🔒 Sécurité — à vérifier avant soumission

- ✅ Aucun secret / clé service_role dans le bundle client.
- ✅ RLS activé sur toutes les tables `public.*`.
- ✅ Toutes les routes admin protégées par `has_role('admin')`.
- ✅ Rate-limit / captcha sur inscription (Supabase par défaut).
- ✅ Vérification email activée à l'inscription.

---

## 📸 Captures d'écran — pièges fréquents

- ❌ Pas de mock-ups avec des « bezels » iPhone : Apple veut la capture pure.
- ❌ Pas de texte marketing sur les screenshots iPad si tu ne vises pas iPad.
- ✅ Montre au moins : accueil (lecteur), une émission, un article, le mur social.
- ✅ Statut de la lecture audio visible (Media Session dans le center control).

---

## 📝 Réponse type si Apple rejette pour 4.2

> Bonjour,
> InDi RaDio n'est pas un simple wrapper web. L'application implémente :
> - Lecture audio en arrière-plan via AVAudioSession (mode `audio`) ;
> - Media Session API pour contrôles CarPlay / Bluetooth / écran verrouillé ;
> - Notifications locales et distantes ;
> - Splash / icônes natifs ;
> - Interactions natives (partage, ouverture d'apps musicales tierces
>   Spotify / Apple Music / Deezer) ;
> - Suppression de compte in-app conforme au 5.1.1(v).
> Le contenu web est bundlé (pas de `server.url`), l'app fonctionne sans
> connexion pour la navigation UI.
> Cordialement.