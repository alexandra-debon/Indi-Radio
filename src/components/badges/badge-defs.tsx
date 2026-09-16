import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Crown,
  Feather,
  Flame,
  Headphones,
  Heart,
  Mic,
  Music,
  Palette,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface BadgeDef {
  id: string;
  key: string;
  label_fr: string;
  label_en: string | null;
  icon: string;
  color: string;
  description: string | null;
  position: number;
}

export const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  star: Star,
  crown: Crown,
  flame: Flame,
  heart: Heart,
  music: Music,
  feather: Feather,
  mic: Mic,
  sparkles: Sparkles,
  trophy: Trophy,
  palette: Palette,
  headphones: Headphones,
};

export const BADGE_ICON_KEYS = Object.keys(BADGE_ICONS);

export function useBadgeDefs() {
  return useQuery<BadgeDef[]>({
    queryKey: ["badge-definitions"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_definitions")
        .select("id, key, label_fr, label_en, icon, color, description, position")
        .order("position", { ascending: true })
        .order("label_fr", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BadgeDef[];
    },
  });
}

export function useBadgeLabel() {
  const { lang } = useLang();
  return (def: BadgeDef) => (lang === "en" ? def.label_en || def.label_fr : def.label_fr);
}

/** Puce d'un badge attribué (définition admin si connue, sinon texte brut). */
export function BadgeChip({
  badgeKey,
  def,
  className,
}: {
  badgeKey: string;
  def?: BadgeDef;
  className?: string;
}) {
  const label = useBadgeLabel();
  const Icon = def ? (BADGE_ICONS[def.icon] ?? Award) : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black",
        className,
      )}
      style={{ backgroundColor: def?.color ?? "var(--primary)" }}
      title={def?.description ?? undefined}
    >
      {Icon && <Icon className="size-3" />}
      {def ? label(def) : badgeKey}
    </span>
  );
}
