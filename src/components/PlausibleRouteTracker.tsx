import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isNative } from "@/lib/native";
import { trackPageview } from "@/lib/plausible";

/** Compte chaque changement de route SPA (ex. /playlists/<slug>) comme une vue distincte. */
export function PlausibleRouteTracker() {
  const href = useRouterState({
    select: (s) => s.location.pathname + s.location.searchStr,
  });
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (isNative() || typeof window === "undefined") return;
    if (last.current === href) return;
    last.current = href;
    trackPageview(window.location.href);
  }, [href]);

  return null;
}