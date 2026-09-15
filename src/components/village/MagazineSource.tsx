import { BookOpen, Scissors } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Types de partage d'un contenu magazine vers RéDaK'Village. */
export const MAGAZINE_SOURCE_KINDS = ["article_interactif", "extrait_magazine"] as const;
export type MagazineSourceKind = (typeof MAGAZINE_SOURCE_KINDS)[number];

const LABELS_FR: Record<MagazineSourceKind, string> = {
  article_interactif: "Article interactif — RédaK' InDi ArT CulTuRe",
  extrait_magazine: "Extrait Magazine InDi ArT CulTuRe",
};

const LABELS_EN: Record<MagazineSourceKind, string> = {
  article_interactif: "Interactive article — RédaK' InDi ArT CulTuRe",
  extrait_magazine: "InDi ArT CulTuRe magazine excerpt",
};

const ICONS: Record<MagazineSourceKind, typeof BookOpen> = {
  article_interactif: BookOpen,
  extrait_magazine: Scissors,
};

export function useMagazineSourceLabel() {
  const { lang } = useLang();
  const dict = lang === "en" ? LABELS_EN : LABELS_FR;
  return (kind: MagazineSourceKind) => dict[kind];
}

export function useMagazineShareTxt() {
  const { lang } = useLang();
  return lang === "en"
    ? {
        share: "Share in RéDaK'Village",
        choose: "How should this magazine content appear?",
        confirm: "Share",
        cancel: "Cancel",
        shared: "Shared in RéDaK'Village",
        already: "Already shared in RéDaK'Village",
        open: "Open the article",
        error: "Sharing failed, please retry.",
      }
    : {
        share: "Partager dans RéDaK'Village",
        choose: "Comment ce contenu magazine doit-il apparaître ?",
        confirm: "Partager",
        cancel: "Annuler",
        shared: "Partagé dans RéDaK'Village",
        already: "Déjà partagé dans RéDaK'Village",
        open: "Ouvrir l'article",
        error: "Partage impossible pour le moment.",
      };
}

/** Badge affiché sur un article RéDaK'Village issu du magazine. */
export function MagazineSourceBadge({ kind }: { kind: string | null | undefined }) {
  const label = useMagazineSourceLabel();
  if (!kind || !(MAGAZINE_SOURCE_KINDS as readonly string[]).includes(kind)) return null;
  const k = kind as MagazineSourceKind;
  const Icon = ICONS[k];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border-2 border-black bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
      <Icon className="size-3" /> {label(k)}
    </span>
  );
}
