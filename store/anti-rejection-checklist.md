# ✅ Checklist anti-rejet App Store & Google Play — Indi Radio

Suis cette checklist AVANT de soumettre. Elle couvre les motifs de rejet
les plus fréquents pour les apps de radio / streaming audio.

## 🍏 App Store (Apple)

### Guideline 4.2 — « Minimum functionality » / repackaged web
**Risque le plus fréquent pour les apps radio.**
- ✅ `capacitor.config.ts` embarque le bundle `dist/` (pas de `server.url` en prod).
- ✅ L'app expose des fonctions natives : lecture audio en arrière-plan
  (`UIBackgroundModes → audio`), Media Session (contrôles Bluetooth / CarPlay),
  splash natif, icônes natives, notifications.
- ✅ Dans « Notes pour l'examinateur » sur App Store Connect, écris :
  > *App radio hybride : lecture audio en arrière-plan via AVAudioSession,
  > contrôles Media Session pour Bluetooth / voiture, notifications push,
  > interactions natives (partage, ouverture apps musicales). Radio
  > communautaire française indépendante.*

### Guideline 5.1.1(v) — Suppression de compte (OBLIGATOIRE)
- ✅ Bouton « Supprimer mon compte » dans `/profile` (implémenté).
  Confirmation par saisie de « SUPPRIMER », suppression irréversible.

### Guideline 4.8 — Sign in with Apple
Si l'app propose Google / Facebook / autre login social, Apple **exige**
aussi Sign in with Apple sur iOS.
- ⚠️ À activer côté Apple Developer (Capabilities → Sign In with Apple)
  ET côté Supabase (Authentication → Providers → Apple).
  Guide : https://supabase.com/docs/guides/auth/social-login/auth-apple
- Si tu n'ajoutes pas Apple Sign-In, désactive Google login sur iOS avant
  soumission (mais garde-le sur Android).

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
> Indi Radio n'est pas un simple wrapper web. L'application implémente :
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