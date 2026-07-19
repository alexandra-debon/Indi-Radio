import { useEffect, useState } from "react";
import { Share, X, Plus } from "lucide-react";
import { isNative } from "@/lib/native";

const STORAGE_KEY = "ios-install-hint-dismissed";

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Inutile dans l'app native (Capacitor) : elle est déjà installée.
    if (isNative()) return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari legacy
      window.navigator.standalone === true;
    if (!isIOS || isStandalone) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-lg border border-primary/60 bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm">
          <div className="font-bold text-primary">Installer Indi Radio</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Appuie sur <Share className="mx-1 inline size-3.5" /> <b>Partager</b>, puis <b>Sur l'écran d'accueil</b> <Plus className="mx-1 inline size-3.5" />.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}