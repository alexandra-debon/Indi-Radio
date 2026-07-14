import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export interface NotifTarget {
  to: string;
  hash?: string;
}

/** Parse a notification.url like "/#post-abc" or "/actus#news-xyz" into router-safe pieces. */
export function parseNotifUrl(url: string | null | undefined): NotifTarget | null {
  if (!url) return null;
  const [pathRaw, hashRaw] = url.split("#");
  const path = pathRaw || "/";
  return { to: path === "" ? "/" : path, hash: hashRaw || undefined };
}

/** Scroll to `#hash` on mount / hash change and flash a ring highlight on the target. */
export function useHashHighlight() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    if (!id) return;
    let cancelled = false;
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById(id);
      if (!el) {
        if (attempt < 20 && !cancelled) setTimeout(() => tryScroll(attempt + 1), 150);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-primary", "ring-offset-2", "transition");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-primary", "ring-offset-2");
      }, 2200);
    };
    tryScroll();
    return () => { cancelled = true; };
  }, [hash]);
}