import { useEffect, useRef, useState } from "react";

type Options<T> = {
  /** Ne pas enregistrer tant que le brouillon est considéré comme vide. */
  isEmpty?: (value: T) => boolean;
  /** Délai de debounce en ms. */
  delay?: number;
};

/**
 * Enregistre automatiquement un formulaire dans localStorage et le restaure
 * au montage (perte de session, refresh, fermeture d'onglet…).
 */
export function useLocalDraft<T>(
  key: string,
  value: T,
  restore: (value: T) => void,
  options: Options<T> = {},
) {
  const { isEmpty, delay = 700 } = options;
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const ready = useRef(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const emptyRef = useRef(isEmpty);
  emptyRef.current = isEmpty;

  // Restauration au montage
  useEffect(() => {
    ready.current = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; value: T };
        if (parsed && parsed.value) {
          restoreRef.current(parsed.value);
          setSavedAt(parsed.at ?? null);
          setRestoredAt(parsed.at ?? Date.now());
        }
      }
    } catch {
      /* brouillon illisible : on l'ignore */
    }
    ready.current = true;
  }, [key]);

  // Sauvegarde debouncée
  useEffect(() => {
    if (!ready.current) return;
    const t = setTimeout(() => {
      try {
        if (emptyRef.current?.(value)) {
          localStorage.removeItem(key);
          setSavedAt(null);
          return;
        }
        const at = Date.now();
        localStorage.setItem(key, JSON.stringify({ at, value }));
        setSavedAt(at);
      } catch {
        /* quota dépassé : on ignore */
      }
    }, delay);
    return () => clearTimeout(t);
  }, [key, value, delay]);

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    setSavedAt(null);
    setRestoredAt(null);
  };

  return { savedAt, restoredAt, clear };
}
