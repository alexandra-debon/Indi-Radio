import { Crown, Mic, Palette, CheckCircle2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BadgeProfile {
  pseudo: string;
  role: "admin" | "artiste" | "animateur" | "auditeur";
  is_certified: boolean;
  is_team_indi?: boolean | null;
  badges?: string[] | null;
  level?: number | null;
}

export function UserBadge({ profile, className, compact }: { profile: BadgeProfile | null | undefined; className?: string; compact?: boolean }) {
  if (!profile) return <span className={cn("text-muted-foreground", className)}>anonyme</span>;

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
        <CheckCircle2 className="size-3.5 shrink-0 fill-primary text-primary-foreground" aria-label="Compte certifié" />
      )}
      {profile.is_team_indi && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-primary to-destructive px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary-foreground shadow-sm">
          <Radio className="size-3" /> Team Indi
        </span>
      )}
      {profile.role === "admin" && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] uppercase text-destructive-foreground">
          <Crown className="size-3" /> Admin
        </span>
      )}
      {profile.role === "animateur" && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] uppercase text-primary-foreground">
          <Mic className="size-3" /> Anim
        </span>
      )}
      {profile.role === "artiste" && (
        <span className="inline-flex items-center gap-1 rounded-sm border border-primary px-1.5 py-0.5 text-[10px] uppercase text-primary">
          <Palette className="size-3" /> Artiste
        </span>
      )}
      {profile.role === "auditeur" && profile.level && profile.level > 0 && (
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          Niv. {profile.level}
        </span>
      )}
      {profile.badges?.map((b) => (
        <span
          key={b}
          className="inline-flex items-center rounded-sm border border-primary/60 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary"
        >
          {b}
        </span>
      ))}
    </span>
  );
}