# Publication sur l'App Store & Google Play — Indi Radio

Ce guide t'accompagne pas-à-pas pour publier l'app sur les deux stores. **Tout ne peut pas être fait depuis Lovable** : Apple exige un Mac + Xcode + un compte Apple Developer, et Google Play exige un keystore que tu dois générer et conserver toi-même.

---

## ⚠️ Ce que Lovable a déjà préparé

- ✅ Capacitor configuré (`capacitor.config.ts`)
- ✅ Icône source : `resources/icon.png` (1024×1024)
- ✅ Splash source : `resources/splash.png` (1920×1920)
- ✅ Manifest PWA + icônes web
- ✅ Fiches de listing FR/EN dans `store/`
- ✅ Snippets Info.plist / AndroidManifest à copier
- ✅ Privacy Manifest iOS
- ✅ Scripts npm : `cap:sync`, `cap:ios`, `cap:android`, `cap:assets`

## ⚠️ Ce que tu dois faire toi-même

| # | Action | Coût | Où |
|---|---|---|---|
| 1 | Compte Apple Developer | 99 $/an | https://developer.apple.com/programs/ |
| 2 | Compte Google Play Console | 25 $ (une fois) | https://play.google.com/console |
| 3 | Installer Xcode 15+ (Mac uniquement) | Gratuit | Mac App Store |
| 4 | Installer Android Studio | Gratuit | https://developer.android.com/studio |
| 5 | Cloner ce repo en local et lancer `bun install` | - | ton ordinateur |

---

## Étape 1 — Cloner et builder localement

```bash
git clone <url-du-repo>
cd radio-indie-vibes
bun install
bun run build
bunx cap add ios       # une seule fois
bunx cap add android   # une seule fois
```

Cela crée les dossiers `ios/` et `android/` avec les projets natifs.

## Étape 2 — Générer icônes & splash pour toutes les tailles

```bash
bun run cap:assets
```

Lit `resources/icon.png` et `resources/splash.png`, remplit `ios/App/App/Assets.xcassets/` et `android/app/src/main/res/`.

## Étape 3 — Ajouter les permissions natives

**iOS** : suivre `store/ios-info-plist-additions.md` (édite `ios/App/App/Info.plist` et crée `PrivacyInfo.xcprivacy`).

**Android** : suivre `store/android-manifest-additions.md` (édite `AndroidManifest.xml` et `build.gradle`).

## Étape 4 — Synchroniser

```bash
bun run cap:sync
```

---

## Étape 5A — Publier sur l'App Store (iOS)

### 5A.1 — Créer l'app dans App Store Connect
1. Va sur https://appstoreconnect.apple.com/
2. *Mes apps → +* → *Nouvelle app*
3. Plateforme : **iOS**
4. Nom : **Indi Radio**
5. Langue principale : **Français**
6. Bundle ID : **com.indiartculture.radio** (créé automatiquement depuis Xcode au premier archive)
7. SKU : `indi-radio-ios-001`

### 5A.2 — Remplir la fiche
Copie/colle depuis `store/listing-fr.md` (et `listing-en.md` pour la version anglaise) :
- Sous-titre, description, mots-clés
- Catégorie primaire : **Musique**, secondaire : **Divertissement**
- URL support : `https://radio.indi-art-culture.com`
- URL politique de confidentialité : `https://radio.indi-art-culture.com/privacy` *(⚠️ à créer si absente)*

### 5A.3 — Captures d'écran obligatoires
Prépare des screenshots pour :
- iPhone 6.9" (1320×2868) — **obligatoire**, 3 min / 10 max
- iPhone 6.5" (1284×2778) — recommandé
- iPad 13" (2064×2752) — si tu vises l'iPad

Astuce : lance l'app sur le simulateur Xcode (iPhone 15 Pro Max) puis *File → New Screen Shot*.

### 5A.4 — Signer et uploader
1. `bun run cap:ios` (ouvre Xcode)
2. Dans Xcode : sélectionne le projet **App** → onglet *Signing & Capabilities*
3. Coche *Automatically manage signing* et choisis ton **Team**
4. Active *Background Modes → Audio, AirPlay, and Picture in Picture*
5. Menu **Product → Archive**
6. Une fois l'archive prête : **Distribute App → App Store Connect → Upload**
7. Retour sur App Store Connect : sélectionne le build uploadé, remplis les infos de conformité (chiffrement : Non), soumets pour review

Délai review Apple : 24-72 h en général.

### ⚠️ Risque de rejet "wrapper" (Guideline 4.2)
Comme `capacitor.config.ts` pointe `server.url` vers ton site web, Apple peut refuser en disant "cette app n'est qu'un site web". Pour éviter :
- Soit tu retires `server.url` et l'app tourne 100% offline (recompile `bun run build && bunx cap sync` — mais tu perds les updates auto)
- Soit tu justifies dans la note à la review : *"L'app apporte lecture audio en arrière-plan, Media Session pour CarPlay/Bluetooth, notifications push, partage natif — fonctionnalités impossibles en Safari."*

---

## Étape 5B — Publier sur Google Play (Android)

### 5B.1 — Créer l'app dans Play Console
1. Va sur https://play.google.com/console
2. *Toutes les apps → Créer une application*
3. Nom : **Indi Radio**
4. Langue par défaut : **Français (France)**
5. Type : **App**
6. Gratuit

### 5B.2 — Générer le keystore (UNE SEULE FOIS)
Suis les commandes de `store/android-manifest-additions.md`. **Sauvegarde le fichier `.keystore` et les mots de passe hors du repo (1Password, coffre chiffré).** Perdre le keystore = impossible de publier une mise à jour, il faut créer une nouvelle app.

### 5B.3 — Build de l'AAB signé
```bash
bun run cap:android
```

Dans Android Studio :
1. **Build → Generate Signed App Bundle → Android App Bundle**
2. Sélectionne ton keystore, entre les mots de passe
3. Variante : **release**
4. Le fichier `.aab` est généré dans `android/app/release/`

### 5B.4 — Uploader
1. Play Console → *Test et publication → Production → Créer une release*
2. Upload le `.aab`
3. Notes de version : « Première version d'Indi Radio »
4. Remplis les sections obligatoires :
   - **Fiche du store** : description depuis `store/listing-fr.md`
   - **Classification** : questionnaire IARC (répondre honnêtement : contenu musical, UGC modéré → PEGI 12)
   - **Public cible** : 13 ans et +
   - **Politique de confidentialité** : URL obligatoire
   - **Publicités** : Non
   - **Sécurité des données** : Email (pour compte), User ID, contenu généré par l'utilisateur → tout chiffré en transit, pas partagé avec tiers
5. **Captures** : min. 2 (téléphone), format 16:9 ou 9:16, 1080×1920 recommandé
6. **Icône Play Store** : 512×512 PNG (utilise `public/icons/icon-512.png`)
7. **Bannière feature graphic** : 1024×500 PNG

Puis **Envoyer pour examen**. Délai Google : 1-7 jours.

---

## Étape 6 — Politique de confidentialité (obligatoire pour les deux stores)

Actuellement, l'app collecte : email, mot de passe hashé, pseudo, commentaires, notes, votes, présence quotidienne.

Tu dois publier une page `/privacy` sur https://radio.indi-art-culture.com/privacy expliquant :
- Quelles données sont collectées
- Pourquoi
- Où elles sont stockées (Lovable Cloud / Supabase, région UE)
- Comment demander leur suppression (email à `radio@indi-art-culture.com`)
- Cookies utilisés

La page `/privacy` a été générée et est disponible sur :
`https://radio.indi-art-culture.com/privacy`

Un texte court prêt à copier-coller dans les champs store se trouve dans `store/privacy-policy-fr.md`.

---

## Étape 7 — Mises à jour futures

Grâce à `server.url` dans `capacitor.config.ts`, **tout changement web publié depuis Lovable apparaît dans l'app native au prochain lancement**, sans repasser par les stores.

Tu ne dois refaire un build natif que si tu :
- changes l'icône, le splash, le nom ou la version
- ajoutes un plugin natif (push, audio background natif, etc.)
- réponds à une remarque de review Apple/Google

---

## En résumé

Ce que je viens de préparer est **complet côté code** — il ne reste plus qu'à cloner en local, brancher tes comptes développeur, et suivre les étapes 5A / 5B ci-dessus. Chaque commande shell est fournie prête à copier.

Bonne chance pour la soumission — reviens me voir si tu as un rejet à corriger. 🎙️⚡