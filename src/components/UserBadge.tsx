import { Crown, Mic, Palette, CheckCircle2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BadgeProfile {
  pseudo: string;
  role: "admin" | "artiste" | "animateur" | "auditeur";
  is_certified: boolean;
  is_team_indi?: boolean | null;
  level?: number | null;
}

export function UserBadge({ profile, className }: { profile: BadgeProfile | null | undefined; className?: string }) {
  if (!profile) return <span className={cn("text-muted-foreground", className)}>anonyme</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", className)}>
      <span>{profile.pseudo}</span>
      {profile.is_certified && (
        <CheckCircle2 className="size-3.5 fill-primary text-primary-foreground" aria-label="Compte certifié" />
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
    </span>
  );
}