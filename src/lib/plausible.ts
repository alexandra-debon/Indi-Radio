/** Chargement + suivi Plausible côté client (web uniquement, après consentement). */
const PLAUSIBLE_SRC = "https://plausible.io/js/pa-TX5XYkmAdUGR_zI1ikO77.js";
export const ANALYTICS_STORAGE_KEY = "indi-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "indi-analytics-consent-change";

type PlausibleFn = ((...args: unknown[]) => void) & {
  q?: unknown[];
  init?: (i?: unknown) => void;
  o?: unknown;
};

function win(): (Window & { plausible?: PlausibleFn }) | null {
  return typeof window === "undefined" ? null : (window as Window & { plausible?: PlausibleFn });
}

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

export function loadPlausible() {
  const w = win();
  if (!w || typeof document === "undefined") return;
  if (!w.plausible) {
    const fn = function (...args: unknown[]) {
      (fn.q = fn.q || []).push(args);
    } as PlausibleFn;
    fn.init = (i?: unknown) => {
      fn.o = i || {};
    };
    w.plausible = fn;
  }
  if (!document.querySelector(`script[src="${PLAUSIBLE_SRC}"]`)) {
    const s = document.createElement("script");
    s.src = PLAUSIBLE_SRC;
    s.async = true;
    document.head.appendChild(s);
  }
  // Les pages vues sont envoyées manuellement à chaque changement de route SPA.
  w.plausible.init?.({ autoCapturePageviews: false });
}

/** Envoie une page vue pour l'URL courante (ex. /playlists/<slug>). */
export function trackPageview(url?: string) {
  const w = win();
  if (!w || getAnalyticsConsent() !== "accepted") return;
  w.plausible?.("pageview", url ? { u: url } : undefined);
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
  const w = win();
  if (!w || getAnalyticsConsent() !== "accepted") return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props ?? {})) if (v !== undefined) clean[k] = v;
  w.plausible?.(name, Object.keys(clean).length ? { props: clean } : undefined);
}