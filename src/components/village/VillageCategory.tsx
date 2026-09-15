import { useLang } from "@/lib/i18n";
import { Music, BookOpen, Palette, Clapperboard, Camera, Brush, PersonStanding, Tag } from "lucide-react";

export const VILLAGE_CATEGORIES = [
  "musique",
  "livre",
  "art",
  "cinema",
  "photographie",
  "arts_visuels",
  "danse",
] as const;

export type VillageCategory = (typeof VILLAGE_CATEGORIES)[number];

const LABELS: Record<VillageCategory, { fr: string; en: string }> = {
  musique: { fr: "Musique", en: "Music" },
  livre: { fr: "Livre", en: "Book" },
  art: { fr: "Art", en: "Art" },
  cinema: { fr: "Cinéma", en: "Cinema" },
  photographie: { fr: "Photographie", en: "Photography" },
  arts_visuels: { fr: "Arts visuels", en: "Visual arts" },
  danse: { fr: "Danse", en: "Dance" },
};

const ICONS = {
  musique: Music,
  livre: BookOpen,
  art: Palette,
  cinema: Clapperboard,
  photographie: Camera,
  arts_visuels: Brush,
  danse: PersonStanding,
} as const;

export function useVillageCategoryLabel() {
  const { lang } = useLang();
  const key = lang === "en" ? "en" : "fr";
  return (c: VillageCategory) => LABELS[c][key];
}

function useTxt() {
  const { lang } = useLang();
  return lang === "en"
    ? { pick: "Category (optional)", none: "No category", all: "All", freeTag: "Your own tag (optional)", freeTagHint: "One word or short phrase, e.g. street art, festival…" }
    : { pick: "Catégorie (optionnel)", none: "Sans catégorie", all: "Tout", freeTag: "Votre tag libre (optionnel)", freeTagHint: "Un mot ou une courte expression, ex. street art, festival…" };
}

export function useVillageCategoryTxt() {
  return useTxt();
}

export function VillageCategoryBadge({ category }: { category: string | null }) {
  const label = useVillageCategoryLabel();
  if (!category || !(VILLAGE_CATEGORIES as readonly string[]).includes(category)) return null;
  const c = category as VillageCategory;
  const Icon = ICONS[c];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border-2 border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
      <Icon className="size-3" /> {label(c)}
    </span>
  );
}

/** Badge du tag libre saisi par le rédacteur. */
export function FreeTagBadge({ tag }: { tag: string | null | undefined }) {
  if (!tag?.trim()) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-primary bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
      <Tag className="size-3" /> {tag.trim()}
    </span>
  );
}

export function VillageCategoryPicker({
  value,
  onChange,
}: {
  value: VillageCategory | null;
  onChange: (v: VillageCategory | null) => void;
}) {
  const label = useVillageCategoryLabel();
  const txt = useTxt();
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {txt.pick}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={txt.pick}>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={
            "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
            (value === null
              ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
              : "bg-background hover:bg-muted")
          }
        >
          {txt.none}
        </button>
        {VILLAGE_CATEGORIES.map((c) => {
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
                (active
                  ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                  : "bg-background hover:bg-muted")
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

/** Filtre horizontal utilisé en haut de la liste d'articles. */
export function VillageCategoryFilter({
  value,
  onChange,
  available,
}: {
  value: VillageCategory | null;
  onChange: (v: VillageCategory | null) => void;
  available?: readonly string[];
}) {
  const label = useVillageCategoryLabel();
  const txt = useTxt();
  const list = available
    ? VILLAGE_CATEGORIES.filter((c) => available.includes(c))
    : VILLAGE_CATEGORIES;
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={
          "rounded-full border-2 border-black px-2.5 py-1 text-[11px] font-bold transition " +
          (value === null ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
        }
      >
        {txt.all}
      </button>
      {list.map((c) => {
        const Icon = ICONS[c];
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(active ? null : c)}
            aria-pressed={active}
            className={
              "inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-1 text-[11px] font-bold transition " +
              (active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
            }
          >
            <Icon className="size-3" /> {label(c)}
          </button>
        );
      })}
    </div>
  );
}
