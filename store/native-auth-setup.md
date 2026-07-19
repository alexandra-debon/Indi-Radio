# Configuration Sign in with Apple + Google natifs — InDi RaDio

Les plugins natifs sont installés et branchés dans `AuthDialog`.
Sur iOS/Android natif, l'app utilise désormais **la feuille système Apple**
et **le sélecteur de compte Google natif** au lieu du popup web
(obligatoire pour éviter le rejet Apple sur les WebViews).

Sur le site web (radio.indi-art-culture.com), rien ne change : c'est le
flow OAuth Lovable Cloud managé qui reste utilisé.

---

## 🍏 Sign in with Apple — rien à faire côté code

Le `clientId` (`com.indiartculture.radio`) est déjà en dur dans
`src/lib/native-auth.ts`. Il te reste à activer la capability :

1. Portail Apple Developer → **Identifiers → App IDs → `com.indiartculture.radio`**
2. Coche **Sign In with Apple** → *Save*
3. Dans Xcode (après `bun run cap:ios`) : sélectionne la cible **App** →
   *Signing & Capabilities* → **+ Capability → Sign in with Apple**
4. Rebuild via *Product → Archive*

---

## 🤖 Google Sign-In natif — 3 IDs à créer

Va sur https://console.cloud.google.com → *APIs & Services → Credentials* →
**Create credentials → OAuth client ID** et crée **trois** clients OAuth :

| Type | Nom suggéré | À quoi ça sert |
|---|---|---|
| **Web application** | `InDi RaDio – Web` | Vérification serveur des tokens (obligatoire) |
| **iOS** | `InDi RaDio – iOS` | Signature du bundle iOS. Bundle ID : `com.indiartculture.radio` |
| **Android** | `InDi RaDio – Android` | Signature de l'APK. Package name : `com.indiartculture.radio` + SHA-1 de ton keystore |

**Pour récupérer le SHA-1 Android** (après création du keystore, cf.
`store/android-manifest-additions.md`) :

```bash
keytool -list -v -keystore <ton-keystore>.jks -alias <ton-alias>
```

### Reporte les IDs dans le projet

1. **`.env` (Lovable → Workspace Settings → Secrets d'environnement)** :
   ```
   VITE_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
   ```
   (⚠️ variable `VITE_*` = accessible côté client, c'est intentionnel — c'est
   un identifiant public, pas un secret.)

2. **`capacitor.config.ts`** → décommente et remplis `clientId` (Web) et
   `iosClientId` (iOS) dans le bloc `GoogleAuth`.

3. **iOS uniquement** : ajoute le URL Scheme inversé de ton **iOS Client ID**
   dans `ios/App/App/Info.plist` (`CFBundleURLSchemes`) — cf.
   `store/ios-info-plist-additions.md`.

---

## Fallback web / Lovable preview

Si `VITE_GOOGLE_WEB_CLIENT_ID` n'est pas défini, le code retombe
automatiquement sur le popup web Lovable — donc la preview et le site
continuent à fonctionner tout de suite, avant même que tu aies créé les
OAuth clients Google.