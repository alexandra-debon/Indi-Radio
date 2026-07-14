# Ressources natives Indi Radio

Ce dossier contient les images sources utilisées par `bun run cap:assets`
pour générer automatiquement toutes les tailles d'icône et de splash screen
requises par iOS et Android.

## Fichiers attendus

| Fichier | Dimensions | Rôle |
|---|---|---|
| `icon.png` | **1024×1024** PNG (opaque, fond noir #0a0a0a) | Icône de l'app sur l'écran d'accueil |
| `splash.png` | **2732×2732** PNG (logo centré, marge ≈ 30%) | Écran de démarrage |
| `splash-dark.png` *(optionnel)* | 2732×2732 | Splash en mode sombre (identique par défaut) |

## Comment les générer

1. Exporte ton logo carré Indi Radio en 1024×1024 → place-le ici sous le nom `icon.png`.
2. Crée un canvas 2732×2732 noir #0a0a0a, centre le logo (~30% de la largeur) + le wordmark "Indi Radio" en dessous → exporte en `splash.png`.
3. Lance :
   ```bash
   bun run cap:assets
   ```
   Cela remplit `ios/App/App/Assets.xcassets/` et `android/app/src/main/res/` avec toutes les tailles.

> Astuce : tu peux aussi utiliser un service comme [icon.kitchen](https://icon.kitchen) pour générer un `icon.png` propre à partir du logo carré.