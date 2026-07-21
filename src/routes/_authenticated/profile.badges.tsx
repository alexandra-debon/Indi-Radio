import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Award, MessageSquare, FileText, Heart, Mic2, CalendarCheck, Lock } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  { key: "post_1", label: "Première publication", description: "", action: "post", threshold: 1, icon: FileText },
  { key: "post_10", label: "", description: "", action: "post", threshold: 10, icon: FileText },
  { key: "post_50", label: "", description: "", action: "post", threshold: 50, icon: FileText },
  { key: "comment_1", label: "", description: "", action: "comment", threshold: 1, icon: MessageSquare },
  { key: "comment_25", label: "", description: "", action: "comment", threshold: 25, icon: MessageSquare },
  { key: "comment_100", label: "", description: "", action: "comment", threshold: 100, icon: MessageSquare },
  { key: "dedicace_1", label: "", description: "", action: "dedicace", threshold: 1, icon: Mic2 },
  { key: "dedicace_10", label: "", description: "", action: "dedicace", threshold: 10, icon: Mic2 },
  { key: "like_10", label: "", description: "", action: "like_received", threshold: 10, icon: Heart },
  { key: "like_50", label: "", description: "", action: "like_received", threshold: 50, icon: Heart },
  { key: "presence_7", label: "", description: "", action: "presence", threshold: 7, icon: CalendarCheck, unique_days: true },
  { key: "presence_30", label: "", description: "", action: "presence", threshold: 30, icon: CalendarCheck, unique_days: true },
];

function BadgesPage() {
  const { profile, session } = useAuth();
  const { lang, t } = useLang();
  const dateLocale = lang === "en" ? enUS : fr;
  const dateFmt = lang === "en" ? "MMM d, yyyy" : "d MMM yyyy";
  const qc = useQueryClient();
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`badges-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "point_events", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["my-point-events", userId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["auth-profile"] });
          qc.invalidateQueries({ queryKey: ["profile", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, qc]);

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

  if (!profile) return <div className="p-4">{t("badges.loading")}</div>;

  const nextThreshold = LEVEL_THRESHOLDS[profile.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[profile.level - 1] ?? 0;
  const levelProgress = profile.level >= 5 ? 100 : Math.min(100, ((profile.points - prev) / (nextThreshold - prev)) * 100);

  // Group events per action
  const byAction: Record<string, { created_at: string }[]> = {};
  for (const e of events) {
    (byAction[e.action] ??= []).push(e);
  }

  const selected = ACHIEVEMENTS.find((a) => a.key === openKey) ?? null;
  const selectedData = (() => {
    if (!selected) return null;
    const evts = byAction[selected.action] ?? [];
    const counted = selected.unique_days
      ? Array.from(new Set(evts.map((e) => e.created_at.slice(0, 10)))).sort()
      : evts.map((e) => e.created_at);
    const progress = counted.length;
    const unlocked = progress >= selected.threshold;
    const obtainedAt = unlocked ? counted[selected.threshold - 1] : null;
    const recent = [...counted].slice(-5).reverse();
    return { progress, unlocked, obtainedAt, recent };
  })();

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> {t("badges.back")}
      </Link>
      <h1 className="section-title">{t("badges.title")}</h1>

      <section className="card-brut space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Trophy className="size-4 text-primary" /> {t("badges.levelLine")} {profile.level} / 5
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{profile.points} {t("badges.totalPts")}</span>
          {profile.level < 5 && <span className="font-bold">{t("badges.nextTier")} : {nextThreshold} {t("profile.pts")}</span>}
        </div>
        <Progress value={levelProgress} />
        <div className="flex flex-wrap gap-1 pt-1">
          {LEVEL_THRESHOLDS.map((thr, i) => (
            <span
              key={i}
              className={
                "rounded-md border-2 border-border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest " +
                (profile.level >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
              }
            >
              {t("badges.lvlShort")} {i + 1} · {thr} {t("profile.pts")}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-widest">{t("badges.achievementsTitle")}</h2>
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
              <button
                type="button"
                key={a.key}
                onClick={() => setOpenKey(a.key)}
                className={
                  "card-brut space-y-1.5 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary " +
                  (unlocked ? "border-primary bg-primary/5" : "opacity-80")
                }
              >
                <div className="flex items-center gap-2">
                  <div className={"grid size-8 place-items-center rounded-md border-2 border-border " + (unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {unlocked ? <Icon className="size-4" /> : <Lock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black">{t(`ach.${a.key}.label` as never)}</div>
                    <div className="text-[11px] text-muted-foreground">{t(`ach.${a.key}.desc` as never)}</div>
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {Math.min(progress, a.threshold)} / {a.threshold}
                  </span>
                  {obtainedAt && (
                    <span className="font-semibold">
                      {t("badges.obtainedOn")} {format(new Date(obtainedAt), dateFmt, { locale: dateLocale })}
                    </span>
                  )}
                </div>
                <Progress value={Math.min(100, (progress / a.threshold) * 100)} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-brut space-y-2 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Award className="size-4 text-primary" /> {t("badges.teamBadges")}
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
          <p className="text-xs text-muted-foreground">{t("badges.teamEmpty")}</p>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setOpenKey(null)}>
        <DialogContent className="max-w-md">
          {selected && selectedData && (() => {
            const Icon = selected.icon;
            const pct = Math.min(100, (selectedData.progress / selected.threshold) * 100);
            const remaining = Math.max(0, selected.threshold - selectedData.progress);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={"grid size-12 place-items-center rounded-md border-2 border-border " + (selectedData.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {selectedData.unlocked ? <Icon className="size-6" /> : <Lock className="size-6" />}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <DialogTitle className="text-base font-black">{t(`ach.${selected.key}.label` as never)}</DialogTitle>
                      <DialogDescription className="text-xs">{t(`ach.${selected.key}.desc` as never)}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">{t("badges.status")}</span>
                    <span className={selectedData.unlocked ? "text-primary" : "text-muted-foreground"}>
                      {selectedData.unlocked ? t("badges.statusUnlocked") : t("badges.statusLocked")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold">{t("badges.progress")}</span>
                      <span className="text-muted-foreground">{Math.min(selectedData.progress, selected.threshold)} / {selected.threshold}</span>
                    </div>
                    <Progress value={pct} />
                    <div className="text-[11px] text-muted-foreground">
                      {selectedData.unlocked
                        ? t("badges.completed")
                        : `${t("badges.remaining")} : ${remaining} ${t(`badges.action.${selected.action}` as never)}`}
                    </div>
                  </div>

                  {selectedData.obtainedAt && (
                    <div className="rounded-md border-2 border-primary bg-primary/5 p-2 text-xs font-semibold">
                      {t("badges.obtainedOn")} {format(new Date(selectedData.obtainedAt), dateFmt, { locale: dateLocale })}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("badges.howTo")}</div>
                    <p className="text-xs">{t(`ach.${selected.key}.desc` as never)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("badges.recentActivity")}</div>
                    {selectedData.recent.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("badges.noActivity")}</p>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {selectedData.recent.map((d, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span>#{selectedData.progress - i}</span>
                            <span className="text-muted-foreground">{format(new Date(d), dateFmt, { locale: dateLocale })}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenKey(null)}>{t("badges.close")}</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}