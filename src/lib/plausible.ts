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
export const ANALYTICS_DEBUG_KEY = "indi-analytics-debug";

/**
 * Mode debug : activé par VITE_PLAUSIBLE_DEBUG=true, par ?plausible_debug=1
 * dans l'URL, ou en posant localStorage["indi-analytics-debug"] = "1".
 */
export function isPlausibleDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (String(import.meta.env.VITE_PLAUSIBLE_DEBUG) === "true") return true;
  try {
    if (new URLSearchParams(window.location.search).get("plausible_debug") === "1") {
      localStorage.setItem(ANALYTICS_DEBUG_KEY, "1");
      return true;
    }
    return localStorage.getItem(ANALYTICS_DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Active/désactive le mode debug depuis la console : setPlausibleDebug(true). */
export function setPlausibleDebug(on: boolean) {
  try {
    if (on) localStorage.setItem(ANALYTICS_DEBUG_KEY, "1");
    else localStorage.removeItem(ANALYTICS_DEBUG_KEY);
  } catch {
    /* stockage indisponible */
  }
}

function debugLog(message: string, data?: unknown) {
  if (!isPlausibleDebug()) return;
  if (data !== undefined) console.info("[Plausible]", message, data);
  else console.info("[Plausible]", message);
}

/** Résultat de la validation des variables d'environnement analytics. */
export type PlausibleConfigCheck = { valid: boolean; errors: string[] };

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/**
 * Vérifie en runtime la configuration Plausible :
 * - VITE_PLAUSIBLE_DOMAIN doit être un nom de domaine (pas d'URL, pas de slash)
 * - VITE_PLAUSIBLE_ENDPOINT, si défini, doit être une URL http(s) absolue
 */
export function validatePlausibleConfig(): PlausibleConfigCheck {
  const errors: string[] = [];
  const raw = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

  if (raw !== undefined && raw.trim() === "") {
    errors.push(
      "VITE_PLAUSIBLE_DOMAIN est vide. Indiquez le domaine déclaré dans Plausible (ex. radio.indi-art-culture.com) ou supprimez la variable pour utiliser la valeur par défaut.",
    );
  } else if (!DOMAIN_RE.test(PLAUSIBLE_DOMAIN)) {
    errors.push(
      `VITE_PLAUSIBLE_DOMAIN invalide ("${PLAUSIBLE_DOMAIN}") : attendu un nom de domaine seul, sans "https://" ni chemin (ex. radio.indi-art-culture.com).`,
    );
  }

  if (PLAUSIBLE_ENDPOINT !== undefined) {
    if (PLAUSIBLE_ENDPOINT.trim() === "") {
      errors.push(
        "VITE_PLAUSIBLE_ENDPOINT est vide. Renseignez l'URL complète du proxy (ex. https://plausible.io/api/event) ou supprimez la variable.",
      );
    } else {
      try {
        const u = new URL(PLAUSIBLE_ENDPOINT);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
      } catch {
        errors.push(
          `VITE_PLAUSIBLE_ENDPOINT invalide ("${PLAUSIBLE_ENDPOINT}") : attendu une URL absolue http(s) (ex. https://plausible.io/api/event).`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

let configLogged = false;
function configIsUsable(): boolean {
  const { valid, errors } = validatePlausibleConfig();
  if (!valid && !configLogged) {
    configLogged = true;
    console.error(
      "[Plausible] Configuration analytics invalide, suivi désactivé :\n- " + errors.join("\n- "),
    );
  }
  return valid;
}

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
  if (getAnalyticsConsent() !== "accepted") {
    debugLog("consentement absent → aucun envoi");
    return null;
  }
  if (!configIsUsable()) return null;
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
      debugLog("tracker initialisé", {
        domain: PLAUSIBLE_DOMAIN,
        endpoint: PLAUSIBLE_ENDPOINT ?? "(défaut Plausible)",
      });
      return mod;
    });
  }
  return trackerPromise;
}

/** Envoie une page vue pour l'URL courante (ex. /playlists/<slug>). */
export function trackPageview(url?: string) {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "accepted") return;
  loadPlausible()?.then((mod) => {
    debugLog("pageview", { url: url ?? window.location.href });
    mod.track("pageview", url ? { url } : {});
  });
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