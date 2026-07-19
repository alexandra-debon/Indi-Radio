/** Accès paresseux à Capacitor — évite d'importer @capacitor/core au SSR
 *  (le module référence `document` au top-level et casse le rendu serveur). */
function getCapacitor(): { isNativePlatform: () => boolean; getPlatform: () => string } | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const cap = (globalThis as unknown as { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor;
  return cap ?? null;
}

/** True quand l'app tourne dans un wrapper natif iOS ou Android (Capacitor). */
export function isNative(): boolean {
  try {
    return getCapacitor()?.isNativePlatform() ?? false;
  } catch {
    return false;
  }
}

/** "ios" | "android" | "web" */
export function getPlatform(): "ios" | "android" | "web" {
  try {
    const p = getCapacitor()?.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* noop */
  }
  return "web";
}

/** Partage natif (feuille système sur mobile, navigator.share sinon, fallback clipboard). */
export async function shareNative(payload: { title?: string; text?: string; url?: string }): Promise<void> {
  const { title, text, url } = payload;
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: title });
    return;
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, text, url });
      return;
    } catch {
      /* user cancelled */
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard && url) {
    await navigator.clipboard.writeText(url);
  }
}