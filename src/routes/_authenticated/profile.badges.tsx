import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Award, MessageSquare, FileText, Heart, Mic2, CalendarCheck, Lock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/profile/badges")({
  head: () => ({ meta: [{ title: "Mes badges — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: BadgesPage,
});

const LEVEL_THRESHOLDS = [0, 20, 60, 150, 300];

type Achievement = {
  key: string;
  label: string;
  description: string;
  action: "post" | "comment" | "dedicace" | "like_received" | "presence";
  threshold: number;
  icon: React.ComponentType<{ className?: string }>;
  unique_days?: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  { key: "post_1", label: "Première publication", description: "Publier ton premier message sur le mur.", action: "post", threshold: 1, icon: FileText },
  { key: "post_10", label: "Plume active", description: "Publier 10 messages.", action: "post", threshold: 10, icon: FileText },
  { key: "post_50", label: "Voix de la commu", description: "Publier 50 messages.", action: "post", threshold: 50, icon: FileText },
  { key: "comment_1", label: "Premier commentaire", description: "Commenter pour la première fois.", action: "comment", threshold: 1, icon: MessageSquare },
  { key: "comment_25", label: "Bavard·e", description: "Poster 25 commentaires.", action: "comment", threshold: 25, icon: MessageSquare },
  { key: "comment_100", label: "Animateur·rice", description: "Poster 100 commentaires.", action: "comment", threshold: 100, icon: MessageSquare },
  { key: "dedicace_1", label: "Première dédicace", description: "Envoyer une dédicace à l'antenne.", action: "dedicace", threshold: 1, icon: Mic2 },
  { key: "dedicace_10", label: "Fidèle des ondes", description: "Envoyer 10 dédicaces.", action: "dedicace", threshold: 10, icon: Mic2 },
  { key: "like_10", label: "Apprécié·e", description: "Recevoir 10 likes.", action: "like_received", threshold: 10, icon: Heart },
  { key: "like_50", label: "Populaire", description: "Recevoir 50 likes.", action: "like_received", threshold: 50, icon: Heart },
  { key: "presence_7", label: "Auditeur·rice régulier·ère", description: "Se connecter 7 jours différents.", action: "presence", threshold: 7, icon: CalendarCheck, unique_days: true },
  { key: "presence_30", label: "Pilier de la station", description: "Se connecter 30 jours différents.", action: "presence", threshold: 30, icon: CalendarCheck, unique_days: true },
];

function BadgesPage() {
  const { profile, session } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ["my-point-events", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("point_events")
        .select("action, created_at")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  if (!profile) return <div className="p-4">Chargement…</div>;

  const nextThreshold = LEVEL_THRESHOLDS[profile.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[profile.level - 1] ?? 0;
  const levelProgress = profile.level >= 5 ? 100 : Math.min(100, ((profile.points - prev) / (nextThreshold - prev)) * 100);

  // Group events per action
  const byAction: Record<string, { created_at: string }[]> = {};
  for (const e of events) {
    (byAction[e.action] ??= []).push(e);
  }

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> Retour au profil
      </Link>
      <h1 className="section-title">Mes badges</h1>

      <section className="card-brut space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Trophy className="size-4 text-primary" /> Niveau {profile.level} / 5
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{profile.points} pts au total</span>
          {profile.level < 5 && <span className="font-bold">Palier suivant : {nextThreshold} pts</span>}
        </div>
        <Progress value={levelProgress} />
        <div className="flex flex-wrap gap-1 pt-1">
          {LEVEL_THRESHOLDS.map((t, i) => (
            <span
              key={i}
              className={
                "rounded-md border-2 border-border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest " +
                (profile.level >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
              }
            >
              Nv {i + 1} · {t} pts
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-widest">Succès</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const evts = byAction[a.action] ?? [];
            const counted = a.unique_days
              ? Array.from(new Set(evts.map((e) => e.created_at.slice(0, 10)))).sort()
              : evts.map((e) => e.created_at);
            const progress = counted.length;
            const unlocked = progress >= a.threshold;
            const obtainedAt = unlocked ? counted[a.threshold - 1] : null;
            const Icon = a.icon;
            return (
              <div
                key={a.key}
                className={
                  "card-brut space-y-1.5 p-3 " +
                  (unlocked ? "border-primary bg-primary/5" : "opacity-80")
                }
              >
                <div className="flex items-center gap-2">
                  <div className={"grid size-8 place-items-center rounded-md border-2 border-border " + (unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {unlocked ? <Icon className="size-4" /> : <Lock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground">{a.description}</div>
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {Math.min(progress, a.threshold)} / {a.threshold}
                  </span>
                  {obtainedAt && (
                    <span className="font-semibold">
                      Obtenu le {format(new Date(obtainedAt), "d MMM yyyy", { locale: fr })}
                    </span>
                  )}
                </div>
                <Progress value={Math.min(100, (progress / a.threshold) * 100)} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-brut space-y-2 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Award className="size-4 text-primary" /> Badges attribués par l'équipe
        </h2>
        {profile.badges && profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span key={b} className="rounded-md border-2 border-border bg-primary px-2 py-1 text-[11px] font-black uppercase tracking-widest text-primary-foreground">
                {b}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucun badge personnalisé pour le moment. Les badges honorifiques sont attribués par l'équipe InDi.
          </p>
        )}
      </section>
    </div>
  );
}