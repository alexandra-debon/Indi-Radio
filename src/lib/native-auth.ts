import { supabase } from "@/integrations/supabase/client";
import { isNative, getPlatform } from "@/lib/native";

/**
 * Google Web Client ID (OAuth Web application, requis par
 * @codetrix-studio/capacitor-google-auth pour la vérification serveur).
 * À renseigner via VITE_GOOGLE_WEB_CLIENT_ID. Sans cette valeur, le
 * fallback web (popup Lovable) est utilisé.
 */
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as
  | string
  | undefined;

let googleInitialized = false;

async function ensureGoogleInit() {
  if (googleInitialized || !GOOGLE_WEB_CLIENT_ID) return;
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  await GoogleAuth.initialize({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    grantOfflineAccess: false,
  });
  googleInitialized = true;
}

/**
 * True si on peut faire du natif Apple pour ce provider :
 * - iOS uniquement pour Apple
 * - iOS + Android pour Google (si Web Client ID configuré)
 */
export function canUseNativeAuth(provider: "google" | "apple"): boolean {
  if (!isNative()) return false;
  if (provider === "apple") return getPlatform() === "ios";
  if (provider === "google") return !!GOOGLE_WEB_CLIENT_ID;
  return false;
}

/** Connexion Google native (iOS + Android via Capacitor). */
export async function signInWithGoogleNative() {
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error("Google Web Client ID manquant.");
  await ensureGoogleInit();
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  const user = await GoogleAuth.signIn();
  const idToken = user.authentication?.idToken;
  if (!idToken) throw new Error("Aucun idToken renvoyé par Google.");
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
}

/** Sign in with Apple natif (iOS uniquement). */
export async function signInWithAppleNative() {
  const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
  const res = await SignInWithApple.authorize({
    clientId: "com.indiartculture.radio",
    // redirectURI est ignoré en flow natif mais requis par le type.
    redirectURI: "https://radio.indi-art-culture.com/",
    scopes: "email name",
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
  });
  const idToken = res.response?.identityToken;
  if (!idToken) throw new Error("Aucun identityToken renvoyé par Apple.");
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
  });
  if (error) throw error;
}

/** Déconnexion — révoque aussi la session Google native si elle existait. */
export async function signOutNative() {
  if (isNative() && GOOGLE_WEB_CLIENT_ID) {
    try {
      await ensureGoogleInit();
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      await GoogleAuth.signOut();
    } catch {
      /* pas de session Google active */
    }
  }
  await supabase.auth.signOut();
}