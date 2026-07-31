/**
 * Detects "the JS chunk could not be loaded" failures (typically after a new
 * deploy invalidates the previous asset hashes, or on a flaky mobile network)
 * and silently reloads the page once instead of showing the generic error
 * screen. The user experience becomes: nothing happens, the page just works.
 */
const RETRY_KEY = "indi:chunk-reload";
const RETRY_WINDOW_MS = 20_000;

const PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "unable to preload css",
  "loading chunk",
  "loading css chunk",
  "'text/html' is not a valid javascript mime type",
  "expected a javascript module script",
  "dynamically imported module",
];

export function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return PATTERNS.some((p) => lower.includes(p));
}

/** Reloads once (per short window) for the current URL. Returns true if a reload was triggered. */
export function attemptChunkReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(RETRY_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as { url?: string; at?: number };
      if (
        prev.url === window.location.href &&
        typeof prev.at === "number" &&
        Date.now() - prev.at < RETRY_WINDOW_MS
      ) {
        return false; // already retried recently — let the error screen show
      }
    }
    window.sessionStorage.setItem(
      RETRY_KEY,
      JSON.stringify({ url: window.location.href, at: Date.now() }),
    );
  } catch {
    /* private mode — still try one reload */
  }
  window.location.reload();
  return true;
}

/** Arms a global listener for Vite's module preload failures. */
export function installChunkReloadListener() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __indiChunkReload?: boolean };
  if (w.__indiChunkReload) return;
  w.__indiChunkReload = true;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    attemptChunkReload();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      attemptChunkReload();
    }
  });
}
