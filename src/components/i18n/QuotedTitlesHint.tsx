import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const STORAGE_KEY = "indi.quotedTitlesHint.dismissed";

/**
 * Small dismissible tip shown to English-writing users, reminding them to put
 * song / album titles between quotes so they are preserved (untranslated)
 * for French readers.
 */
export function QuotedTitlesHint({ className }: { className?: string }) {
  const { lang, t } = useLang();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (lang !== "en" || dismissed) return null;

  return (
    <div
      className={`mt-2 flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] leading-snug text-foreground ${className ?? ""}`}
      role="note"
    >
      <span className="flex-1">{t("wall.quotedTitlesHint")}</span>
      <button
        type="button"
        aria-label={t("wall.quotedTitlesDismiss")}
        title={t("wall.quotedTitlesDismiss")}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}