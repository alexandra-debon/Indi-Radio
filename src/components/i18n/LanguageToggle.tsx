import { Globe } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next = lang === "fr" ? "en" : "fr";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
      title={lang === "fr" ? "English" : "Français"}
      className={
        "inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-2 py-1 text-[11px] font-black text-black shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] transition-transform " +
        (className ?? "")
      }
    >
      <Globe className="size-3" strokeWidth={3} />
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );
}