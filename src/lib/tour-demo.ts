import { useSyncExternalStore } from "react";

export const DEMO_PSEUDO = "welcomeListener";

let active = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setTourDemoActive(v: boolean) {
  if (active === v) return;
  active = v;
  emit();
}

export function useTourDemoActive() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
    () => false,
  );
}