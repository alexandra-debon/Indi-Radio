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
    // Ne transmettre que les champs remplis : sur Android, Facebook n'affiche
    // l'aperçu que si l'envoi contient le lien seul.
    await Share.share({
      ...(title ? { title, dialogTitle: title } : {}),
      ...(text ? { text } : {}),
      ...(url ? { url } : {}),
    });
    return;
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
        ...(url ? { url } : {}),
      });
      return;
    } catch (err) {
      // Annulation par l'utilisateur : on s'arrête là, sans copier.
      if ((err as { name?: string })?.name === "AbortError") return;
      throw err;
    }
  }
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as Navigator | undefined;
  if (nav?.clipboard && url) {
    await nav.clipboard.writeText(url);
  }
}