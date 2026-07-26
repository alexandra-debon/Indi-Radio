/**
 * Current display surface, used to decide where a broadcast partner appears.
 * Native apps are excluded upstream by `isNative()`.
 */
export type Surface = "web_desktop" | "pwa_android" | "pwa_ios";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch {
    /* noop */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  const touch = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
  return ua.includes("Mac") && touch > 1;
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/** Detects the surface currently rendering the app (browser side only). */
export function getSurface(): Surface {
  if (isStandalonePwa()) {
    if (isIOS()) return "pwa_ios";
    if (isAndroid()) return "pwa_android";
    return "web_desktop";
  }
  return "web_desktop";
}

export const ALL_SURFACES: Surface[] = ["web_desktop", "pwa_android", "pwa_ios"];

export const SURFACE_LABELS: Record<Surface, string> = {
  web_desktop: "Site web (desktop / mobile navigateur)",
  pwa_android: "PWA Android (installée)",
  pwa_ios: "PWA iOS (installée)",
};
