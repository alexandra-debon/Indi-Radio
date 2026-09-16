import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/**
 * Paliers visuels du système de points (profiles.level, 1 → 5).
 * Codes couleur communs au mur, à RéDaK'Village et aux pages profils.
 */
export const LEVEL_TIER_CLASS: Record<number, string> = {
  1: "bg-muted text-muted-foreground border-border",
  2: "bg-sky-500/15 text-sky-600 border-sky-500/60 dark:text-sky-300",
  3: "bg-emerald-500/15 text-emerald-600 border-emerald-500/60 dark:text-emerald-300",
  4: "bg-orange-500/15 text-orange-600 border-orange-500/60 dark:text-orange-300",
  5: "bg-primary text-primary-foreground border-primary",
};

const TIER_NAME_FR: Record<number, string> = {
  1: "Plume débutante",
  2: "Plume curieuse",
  3: "Plume confirmée",
  4: "Plume d'or",
  5: "Plume légendaire",
};

const TIER_NAME_EN: Record<number, string> = {
  1: "Rookie pen",
  2: "Curious pen",
  3: "Seasoned pen",
  4: "Golden pen",
  5: "Legendary pen",
};

export function useTierName() {
  const { lang } = useLang();
  return (level: number) => {
    const lvl = Math.min(5, Math.max(1, level || 1));
    return (lang === "en" ? TIER_NAME_EN : TIER_NAME_FR)[lvl];
  };
}

export function levelTierClass(level: number | null | undefined) {
  return LEVEL_TIER_CLASS[Math.min(5, Math.max(1, level || 1))];
}

export function LevelTierBadge({
  level,
  className,
}: {
  level: number | null | undefined;
  className?: string;
}) {
  const tierName = useTierName();
  const { lang } = useLang();
  if (!level || level < 1) return null;
  const lvl = Math.min(5, level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest",
        levelTierClass(lvl),
        className,
      )}
      title={tierName(lvl)}
    >
      <span>{lang === "en" ? `LVL ${lvl}` : `NIV. ${lvl}`}</span>
      <span className="hidden sm:inline">· {tierName(lvl)}</span>
    </span>
  );
}
