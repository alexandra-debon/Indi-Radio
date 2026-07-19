import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — InDi RaDio native app (iOS + Android).
 *
 * IMPORTANT — App Store Guideline 4.2 :
 * Une app qui ne fait que charger un site web distant (server.url pointant
 * vers un domaine public) est très souvent rejetée comme « repackaged web
 * content ». On embarque donc le bundle `dist/` par défaut : l'app est un
 * vrai hybride (audio en arrière-plan, Media Session, notifications,
 * PWA offline, écrans natifs de splash).
 *
 * Pour développer contre le site en live, dé-commente le bloc `server`
 * ci-dessous (uniquement en local, JAMAIS pour la build de production).
 */
const config: CapacitorConfig = {
  appId: "com.indiartculture.radio",
  appName: "InDi RaDio",
  // TanStack Start + Nitro n'émet PAS de bundle SPA autonome : le build
  // génère `dist/client/` (assets + shell index.html injecté par
  // `scripts/capacitor-shell.mjs`) et `dist/server/` (worker SSR). L'app
  // native charge donc le site publié via `server.url` ; le shell HTML sert
  // uniquement de fallback offline + à satisfaire l'invariant `cap sync`
  // qui exige un `index.html` dans `webDir`.
  webDir: "dist/client",
  server: {
    url: "https://radio.indi-art-culture.com",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
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
    // Sign in with Google natif (iOS + Android).
    // Renseigne les IDs OAuth récupérés dans Google Cloud Console :
    // - clientId  = OAuth Web application client ID (obligatoire)
    // - iosClientId = OAuth iOS client ID
    // Puis expose côté build : VITE_GOOGLE_WEB_CLIENT_ID (même valeur que clientId).
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "860841844830-9k5oqmqtd0siicarpp76j0ub51r595ag.apps.googleusercontent.com",
      iosClientId: "860841844830-dtmkl9pl27m4hiqrg15v856gke877ort.apps.googleusercontent.com",
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;