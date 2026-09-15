import { useLang } from "@/lib/i18n";
import { Music, BookOpen, Palette, X } from "lucide-react";

export const POST_CATEGORIES = ["musique", "livre", "art"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

const LABELS: Record<PostCategory, { fr: string; en: string }> = {
  musique: { fr: "Musique", en: "Music" },
  livre: { fr: "Livre", en: "Book" },
  art: { fr: "Art", en: "Art" },
};

const ICONS = { musique: Music, livre: BookOpen, art: Palette } as const;

export function useCategoryLabel() {
  const { lang } = useLang();
  const key = lang === "en" ? "en" : "fr";
  return (c: PostCategory) => LABELS[c][key];
}

export function useCategoryTxt() {
  const { lang } = useLang();
  return lang === "en"
    ? { pick: "Category (optional)", none: "No category", filter: "Category", all: "All", reset: "Reset" }
    : { pick: "Catégorie (optionnel)", none: "Sans catégorie", filter: "Catégorie", all: "Tout", reset: "Réinitialiser" };
}

/** Badge affiché sur une publication catégorisée. */
export function CategoryBadge({ category, accent }: { category: string | null; accent?: string | null }) {
  const label = useCategoryLabel();
  if (!category || !(POST_CATEGORIES as readonly string[]).includes(category)) return null;
  const c = category as PostCategory;
  const Icon = ICONS[c];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 border-2 border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
      style={accent ? { backgroundColor: accent, color: "#000", borderColor: accent } : undefined}
    >
      <Icon className="size-3" /> {label(c)}
    </span>
  );
}

/** Sélecteur de catégorie optionnelle, utilisé dans les composers. */
export function CategoryPicker({
  value,
  onChange,
  name,
}: {
  value: PostCategory | null;
  onChange: (v: PostCategory | null) => void;
  name?: string;
}) {
  const label = useCategoryLabel();
  const txt = useCategoryTxt();
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{txt.pick}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={txt.pick} data-name={name}>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={
            "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
            (value === null ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
          }
        >
          {txt.none}
        </button>
        {POST_CATEGORIES.map((c) => {
          const Icon = ICONS[c];
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active ? null : c)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                (active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
              }
            >
              <Icon className="size-3" /> {label(c)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Barre de filtre par catégorie, affichée au-dessus d'une liste de publications. */
export function CategoryFilter({
  value,
  onChange,
  accent,
}: {
  value: PostCategory | null;
  onChange: (v: PostCategory | null) => void;
  accent?: string | null;
}) {
  const label = useCategoryLabel();
  const txt = useCategoryTxt();
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background/40 p-2">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{txt.filter}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={
          "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
          (value === null ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
        }
        style={value === null && accent ? { backgroundColor: accent, color: "#000" } : undefined}
      >
        {txt.all}
      </button>
      {POST_CATEGORIES.map((c) => {
        const Icon = ICONS[c];
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(active ? null : c)}
            aria-pressed={active}
            className={
              "inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
              (active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
            }
            style={active && accent ? { backgroundColor: accent, color: "#000" } : undefined}
          >
            <Icon className="size-3" /> {label(c)}
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="size-3" /> {txt.reset}
        </button>
      )}
    </div>
  );
}
