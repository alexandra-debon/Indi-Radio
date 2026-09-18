import { useState } from "react";
import { X, Clock } from "lucide-react";
import { useLang } from "@/lib/i18n";

const DISMISS_KEY = "indi.pendingArtistNotice.v1";

const TXT = {
  fr: {
    title: "Candidature en cours d'examen",
    body:
      "Ta page ne s'affichera en mode artiste public qu'après validation par l'équipe. En attendant, tu peux déjà tout personnaliser ici, et tu participes normalement à la communauté avec tes droits d'auditeur-lecteur : écoute, mur, commentaires, likes et dédicaces.",
    close: "Fermer",
  },
  en: {
    title: "Application under review",
    body:
      "Your page will only switch to public artist mode once the team approves it. In the meantime you can already customise everything here, and you take part in the community as usual with your listener-reader rights: radio, wall, comments, likes and dedications.",
    close: "Close",
  },
};

/** Popup non bloquante affichée tant que la candidature artiste est en attente. */
export function PendingCertificationNotice() {
  const { lang } = useLang();
  const txt = TXT[lang === "en" ? "en" : "fr"];
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) !== "1";
    } catch {
      return true;
    }
  });

  if (!open) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setOpen(false);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-40 max-w-sm border-2 border-border bg-card p-3 shadow-[4px_4px_0_0_#000] sm:left-auto sm:right-4"
    >
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">{txt.title}</div>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{txt.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={txt.close}
          className="shrink-0 rounded-sm p-1 hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
