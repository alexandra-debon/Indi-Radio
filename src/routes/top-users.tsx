import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/top-users")({
  head: () => ({
    meta: [
      { title: "Top Utilisateurs — Les 25 plus actifs | InDi RaDio" },
      { name: "description", content: "Classement des 25 auditeurs les plus actifs de la communauté InDi RaDio, triés par points gagnés." },
      { property: "og:title", content: "Top Utilisateurs — InDi RaDio" },
      { property: "og:description", content: "Les 25 membres les plus actifs de la communauté." },
    ],
  }),
  component: TopUsersPage,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Introuvable.</div>,
});

type UserRow = {
  id: string;
  pseudo: string | null;
  avatar_url: string | null;
  points: number | null;
  level: number | null;
  role: string | null;
  is_certified: boolean | null;
};

async function fetchTopUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, points, level, role, is_certified")
    .is("quarantined_at", null)
    .order("points", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-6 text-primary" aria-label="1er" />;
  if (rank === 2) return <Medal className="size-6 text-primary/80" aria-label="2e" />;
  if (rank === 3) return <Award className="size-6 text-primary/60" aria-label="3e" />;
  return <span className="w-6 text-center text-sm font-bold text-muted-foreground tabular-nums">{rank}</span>;
}

function TopUsersPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["top-users"], queryFn: fetchTopUsers });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Top Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">Les 25 membres les plus actifs de la communauté, classés par points.</p>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      ) : data.length === 0 ? (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">Pas encore de classement.</div>
      ) : (
        <ol className="space-y-2">
          {data.map((u, i) => {
            const rank = i + 1;
            const pseudo = u.pseudo ?? "auditeur";
            return (
              <li key={u.id} className="card-brut flex items-center gap-3 p-3">
                <div className="grid size-8 place-items-center"><RankBadge rank={rank} /></div>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" loading="lazy" className="size-12 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-full bg-muted text-sm font-black uppercase">
                    {pseudo.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">@{pseudo}</span>
                    {u.is_certified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Certifié" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>{u.role ?? "auditeur"}</span>
                    <span>·</span>
                    <span>Niveau {u.level ?? 1}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black tabular-nums text-primary">{u.points ?? 0}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">points</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}