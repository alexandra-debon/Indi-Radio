# InDi RaDio — App iOS & Android (Capacitor)

Ce projet est enveloppé avec **Capacitor** : le site web devient une vraie
application native, publiable sur l'App Store et Google Play, tout en
continuant à recevoir les mises à jour de contenu automatiquement (l'app
native charge `https://radio.indi-art-culture.com`).

---

## Prérequis (une seule fois)

### Sur Mac (pour iOS)
- [Xcode 15+](https://apps.apple.com/fr/app/xcode/id497799835) (App Store, gratuit)
- Un [compte Apple Developer](https://developer.apple.com/programs/) — 99 $/an, requis pour publier
- CocoaPods : `sudo gem install cocoapods`

### Sur Mac / Windows / Linux (pour Android)
- [Android Studio](https://developer.android.com/studio) (gratuit)
- Un [compte Google Play Console](https://play.google.com/console) — 25 $ une seule fois, requis pour publier

### Dans tous les cas
- Node.js 20+ ou Bun installé
- Le repo Lovable cloné en local

---

## Étape 1 — Préparer les ressources graphiques

Voir `resources/README.md` :
1. Place `resources/icon.png` (1024×1024)
2. Place `resources/splash.png` (2732×2732)
3. Lance `bun run cap:assets`

---

## Étape 2 — Ajouter les plateformes natives (une seule fois)

```bash
bun install
bun run build
bunx cap add ios
bunx cap add android
```

Cela crée les dossiers `ios/` et `android/`.
**Ne les commit pas** tant que tu n'as pas signé — ajoute-les à `.gitignore`
en local si tu préfères travailler sur ta machine.

---

## Étape 3 — Builder et ouvrir dans Xcode / Android Studio

À chaque changement web à intégrer dans l'app native :

```bash
bun run cap:sync        # build + sync des deux plateformes
bun run cap:ios         # + ouvre le projet Xcode
bun run cap:android     # + ouvre le projet Android Studio
```

Depuis Xcode ou Android Studio :
- **iOS** : sélectionne ton compte Apple Developer dans *Signing & Capabilities*, puis *Product → Archive* → *Distribute App → App Store Connect*.
- **Android** : *Build → Generate Signed Bundle → Android App Bundle (.aab)*, signe avec un keystore que tu conserves précieusement, puis upload sur Google Play Console.

---

## Mises à jour de contenu (sans repasser par les stores)

Comme `capacitor.config.ts` pointe `server.url` vers le site publié, **toute
modification web publiée depuis Lovable est visible immédiatement dans l'app
native** au prochain lancement. Tu n'as besoin de refaire un build natif que
pour :
- changer l'icône, le splash, le nom de l'app
- ajouter un plugin natif (audio background, push, etc.)
- corriger un bug lié au wrapper natif

---

## À venir (lots 2 et 3)

- **Lot 2** : lecture audio en arrière-plan + contrôles depuis l'écran verrouillé, partage natif.
- **Lot 3** : notifications push (APNs + FCM), page de préférences.

---

## Documentation officielle

- https://capacitorjs.com/docs
- https://developer.apple.com/app-store/submissions/
- https://support.google.com/googleplay/android-developer/answer/9859152