# Ajouts à faire dans `ios/App/App/Info.plist`

Après `bunx cap add ios`, ouvre `ios/App/App/Info.plist` et ajoute les clés suivantes (juste avant le `</dict>` final). Apple **exige** une description en clair pour chaque permission ou son rejet est automatique.

```xml
<!-- Lecture audio en arrière-plan (radio + podcasts) -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

<!-- Réseau HTTPS uniquement — pas d'ATS exception -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>

<!-- Localisation utilisateur : NON demandée -->
<!-- Micro : NON demandé (radio en écoute seule) -->
<!-- Caméra / Photos : NON demandés -->

<!-- Info éditeur -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- Langue par défaut FR -->
<key>CFBundleDevelopmentRegion</key>
<string>fr</string>
```

## Privacy Manifest (obligatoire depuis mai 2024)

Crée `ios/App/App/PrivacyInfo.xcprivacy` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

Puis dans Xcode : *File → Add Files to "App"* → coche `PrivacyInfo.xcprivacy`.