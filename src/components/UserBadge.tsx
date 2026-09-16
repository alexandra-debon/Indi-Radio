import { Crown, Mic, Palette, CheckCircle2, Radio, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useBadgeDefs, BadgeChip } from "@/components/badges/badge-defs";
import { LevelTierBadge } from "@/components/LevelTier";

export interface BadgeProfile {
  pseudo: string;
  role: "admin" | "artiste" | "animateur" | "auditeur" | "media";
  is_certified: boolean;
  is_team_indi?: boolean | null;
  badges?: string[] | null;
  level?: number | null;
}

export function UserBadge({ profile, className, compact }: { profile: BadgeProfile | null | undefined; className?: string; compact?: boolean }) {
  const t = useT();
  const { data: badgeDefs = [] } = useBadgeDefs();
  if (!profile) return <span className={cn("text-muted-foreground", className)}>{t("role.auditeur")}</span>;

  if (compact) {
    return (
      <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5 font-semibold", className)}>
        <span className="min-w-0 truncate">{profile.pseudo}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 font-semibold", className)}>
      <span className="break-words">{profile.pseudo}</span>
      {profile.is_certified && (
        <CheckCircle2 className="size-3.5 shrink-0 fill-primary text-primary-foreground" aria-label={t("badge.certifiedAria")} />
      )}
      {profile.is_team_indi && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-primary to-destructive px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary-foreground shadow-sm">
          <Radio className="size-3" /> Team Indi
        </span>
      )}
      {profile.role === "admin" && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] uppercase text-destructive-foreground">
          <Crown className="size-3" /> {t("badge.admin")}
        </span>
      )}
      {profile.role === "animateur" && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] uppercase text-primary-foreground">
          <Mic className="size-3" /> {t("badge.anim")}
        </span>
      )}
      {profile.role === "artiste" && (
        <span className="inline-flex items-center gap-1 rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
          <Palette className="size-3" /> {t("badge.artiste")}
        </span>
      )}
      {profile.role === "media" && (
        <span className="inline-flex items-center gap-1 rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
          <Newspaper className="size-3" /> {t("badge.media")}
        </span>
      )}
      {profile.role === "auditeur" && profile.level && profile.level > 0 && (
        <LevelTierBadge level={profile.level} />
      )}
      {profile.badges?.map((b) => (
        <BadgeChip key={b} badgeKey={b} def={badgeDefs.find((d) => d.key === b)} />
      ))}
    </span>
  );
}