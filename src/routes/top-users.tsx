import { createFileRoute, Link } from "@tanstack/react-router";
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
  badges: string[] | null;
};

async function fetchTopUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, points, level, role, is_certified, badges")
    .is("quarantined_at", null)
    .neq("role", "admin")
    .not("pseudo", "ilike", "Team Moderation")
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
              <li key={u.id}>
                <Link
                  to="/u/$pseudo"
                  params={{ pseudo: pseudo }}
                  className="card-brut flex items-center gap-3 p-3 transition hover:-translate-y-0.5"
                >
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
                    {u.is_certified && (
                      <span className="inline-flex items-center gap-0.5 rounded-md border-2 border-border bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                        <BadgeCheck className="size-3" aria-hidden /> Certifié
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>{u.role ?? "auditeur"}</span>
                    <span>·</span>
                    <span>Niveau {u.level ?? 1}</span>
                  </div>
                  {u.badges && u.badges.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.badges.map((b) => (
                        <span
                          key={b}
                          className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black tabular-nums text-primary">{u.points ?? 0}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">points</span>
                </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}