import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — Indi Radio native app (iOS + Android).
 *
 * `server.url` fait pointer l'app native vers le site publié :
 * les changements web se propagent instantanément sans repasser
 * par l'App Store / Play Store.
 *
 * Pour builder en mode 100% offline (bundle web embarqué),
 * commenter `server.url` puis lancer `bun run build && bunx cap sync`.
 */
const config: CapacitorConfig = {
  appId: "com.indiartculture.radio",
  appName: "Indi Radio",
  webDir: "dist",
  server: {
    url: "https://radio.indi-art-culture.com",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0a",
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: "#0a0a0a",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
      androidSplashResourceName: "splash",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;