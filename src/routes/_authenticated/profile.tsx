import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Mon profil — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

const LEVEL_THRESHOLDS = [0, 20, 60, 150, 300];

function ProfilePage() {
  const { profile, signOut, isAdmin } = useAuth();
  if (!profile) return <div className="p-4">Chargement…</div>;

  const nextThreshold = LEVEL_THRESHOLDS[profile.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[profile.level - 1] ?? 0;
  const progress = profile.level >= 5 ? 100 : Math.min(100, ((profile.points - prev) / (nextThreshold - prev)) * 100);

  return (
    <div className="space-y-4">
      <h1 className="section-title">Mon profil</h1>
      <div className="card-brut space-y-3 p-4">
        <UserBadge profile={profile} className="text-base" />
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Niveau {profile.level}</span>
            <span className="text-sm font-bold">{profile.points} pts</span>
          </div>
          <Progress value={progress} className="mt-1" />
          {profile.level < 5 && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Prochain palier : {nextThreshold} pts
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <Link to="/admin" className="card-brut block p-3 text-center text-sm font-semibold text-destructive">
          → Panneau admin
        </Link>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="size-4" /> Déconnexion
      </Button>
    </div>
  );
}