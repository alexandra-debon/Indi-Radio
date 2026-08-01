/** Chargement + suivi Plausible côté client (web uniquement, après consentement). */
/**
 * Utilise le paquet officiel @plausible-analytics/tracker (navigateur uniquement).
 * Paramétrable sans toucher au code :
 * - VITE_PLAUSIBLE_DOMAIN   : domaine déclaré dans Plausible
 * - VITE_PLAUSIBLE_ENDPOINT : endpoint API (proxy éventuel)
 */
export const PLAUSIBLE_DOMAIN =
  import.meta.env.VITE_PLAUSIBLE_DOMAIN ?? "radio.indi-art-culture.com";
const PLAUSIBLE_ENDPOINT = import.meta.env.VITE_PLAUSIBLE_ENDPOINT as
  | string
  | undefined;
export const ANALYTICS_STORAGE_KEY = "indi-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "indi-analytics-consent-change";

type Tracker = typeof import("@plausible-analytics/tracker");
let trackerPromise: Promise<Tracker> | null = null;

export function getAnalyticsConsent(): "accepted" | "refused" | null {
  try {
    const v = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return v === "accepted" || v === "refused" ? v : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(choice: "accepted" | "refused") {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, choice);
  } catch {
    /* stockage indisponible */
  }
  if (choice === "accepted") loadPlausible();
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: choice }));
}

export function loadPlausible(): Promise<Tracker> | null {
  // Garde-fou : aucune initialisation (donc aucune requête) sans consentement explicite.
  if (typeof window === "undefined") return null;
  if (getAnalyticsConsent() !== "accepted") return null;
  if (!trackerPromise) {
    trackerPromise = import("@plausible-analytics/tracker").then((mod) => {
      mod.init({
        domain: PLAUSIBLE_DOMAIN,
        ...(PLAUSIBLE_ENDPOINT ? { endpoint: PLAUSIBLE_ENDPOINT } : {}),
        // Les pages vues sont envoyées manuellement à chaque changement de route SPA.
        autoCapturePageviews: false,
        outboundLinks: true,
        fileDownloads: true,
      });
      return mod;
    });
  }
  return trackerPromise;
}

/** Envoie une page vue pour l'URL courante (ex. /playlists/<slug>). */
export function trackPageview(url?: string) {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "accepted") return;
  loadPlausible()?.then((mod) => mod.track("pageview", url ? { url } : {}));
}

/** Noms d'événements suivis (actions clés de l'app). */
export type PlausibleEvent =
  | "radio_play"
  | "radio_pause"
  | "episode_play"
  | "episode_pause"
  | "share"
  | "like"
  | "comment"
  | "vote"
  | "host_profile_click"
  | "show_open"
  | "show_page_view";

/**
 * Envoie un événement personnalisé Plausible (ignoré sans consentement).
 * Ex: trackEvent("share", { network: "facebook", type: "playlist" })
 */
export function trackEvent(
  name: PlausibleEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "accepted") return;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(props ?? {})) if (v !== undefined) clean[k] = String(v);
  loadPlausible()?.then((mod) =>
    mod.track(name, Object.keys(clean).length ? { props: clean } : {}),
  );
}