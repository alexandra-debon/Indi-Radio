# Ajouts à faire dans `android/app/src/main/AndroidManifest.xml`

Après `bunx cap add android`, vérifie que ces permissions sont présentes (Capacitor 8 les ajoute automatiquement pour la plupart — supprime celles inutiles) :

```xml
<!-- Réseau : requis pour le stream radio -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Lecture audio en arrière-plan avec notification -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Ne PAS ajouter : localisation, caméra, contacts, SMS, stockage externe -->
```

## `build.gradle` (module app) — minimums Play Store

```gradle
android {
  compileSdk 35
  defaultConfig {
    applicationId "com.indiartculture.radio"
    minSdk 23        // Android 6.0 — couvre 99% du parc
    targetSdk 35     // requis par Play Store depuis août 2025
    versionCode 1    // incrémente à chaque upload
    versionName "1.0.0"
  }
}
```

## Signature (keystore)

Génère UNE SEULE FOIS ton keystore et conserve-le en lieu sûr (perte = plus jamais de mise à jour possible) :

```bash
keytool -genkey -v -keystore indi-radio-release.keystore \
  -alias indi-radio -keyalg RSA -keysize 2048 -validity 10000
```

Puis dans `android/app/build.gradle` :

```gradle
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("INDI_KEYSTORE_PATH") ?: "indi-radio-release.keystore")
      storePassword System.getenv("INDI_KEYSTORE_PASSWORD")
      keyAlias "indi-radio"
      keyPassword System.getenv("INDI_KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
    }
  }
}
```