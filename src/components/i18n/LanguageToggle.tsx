import { useLang } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  // La langue est aussi portée par l'URL (?hl=en) : c'est elle qui décide du
  // référencement, donc la bascule doit changer l'URL et pas seulement l'UI.
  const switchTo = (value: "fr" | "en") => {
    setLang(value);
    try {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => {
          const next = { ...(prev ?? {}) };
          if (value === "en") next["hl"] = "en";
          else delete next["hl"];
          return next;
        },
        replace: true,
        resetScroll: false,
      } as never);
    } catch {}
  };
  const options = [
    { value: "fr" as const, label: "FR", aria: "Passer l'application en français" },
    { value: "en" as const, label: "EN", aria: "Switch the app to English" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-end gap-0.5 rounded-md border-2 border-black bg-background p-0.5 shadow-[2px_2px_0_0_#000]",
        className,
      )}
      role="group"
      aria-label="Choix de langue"
    >
      {options.map((option) => {
        const active = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => switchTo(option.value)}
            aria-label={option.aria}
            aria-pressed={active}
            className={cn(
              "relative min-w-8 rounded px-1.5 pb-1 pt-0.5 text-[11px] font-black leading-none text-foreground transition-colors",
              active && "bg-primary text-primary-foreground",
            )}
          >
            {option.label}
            <span
              className={cn(
                "absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-transparent",
                active && "bg-black",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}