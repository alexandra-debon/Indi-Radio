import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, Ban, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/blocages")({
  head: () => ({
    meta: [{ title: "Blocages entre membres — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminBlocksPage,
});

type BlockRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
};

type MiniProfile = { id: string; pseudo: string; stage_name: string | null; avatar_url: string | null };

function AdminBlocksPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("user_blocks")
      .select("id, blocker_id, blocked_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as BlockRow[];
    setRows(list);
    const ids = Array.from(new Set(list.flatMap((r) => [r.blocker_id, r.blocked_id])));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("id, pseudo, stage_name, avatar_url")
        .in("id", ids);
      const map: Record<string, MiniProfile> = {};
      for (const p of (profs ?? []) as MiniProfile[]) map[p.id] = p;
      setProfiles(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const name = (id: string) => {
    const p = profiles[id];
    return p ? p.stage_name || p.pseudo : id.slice(0, 8);
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!q) return true;
        return [name(r.blocker_id), name(r.blocked_id), r.reason ?? ""].some((v) =>
          v.toLowerCase().includes(q),
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, profiles, q],
  );

  const mostBlocked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.blocked_id, (counts.get(r.blocked_id) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <Ban className="size-7 text-destructive" /> Blocages entre membres
      </h1>
      <p className="mt-1 text-muted-foreground">
        {rows.length} blocage(s) enregistré(s). Un blocage masque les contenus d'un membre pour celui qui
        l'a bloqué&nbsp;: cette page sert au suivi de modération, elle ne modifie rien.
      </p>

      {mostBlocked.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Membres les plus bloqués</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {mostBlocked.map(([id, count]) => (
              <li key={id}>
                {name(id)} — {count} blocage(s)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          lang="fr"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un membre ou un motif…"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
        />
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-1 size-4" /> Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Aucun blocage à afficher.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((r) => {
            const blocked = profiles[r.blocked_id];
            const blocker = profiles[r.blocker_id];
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {blocked?.avatar_url ? (
                    <img src={blocked.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                  ) : (
                    <div className="size-8 rounded-full bg-muted" />
                  )}
                  <span className="font-semibold">
                    {blocked ? (
                      <Link to="/u/$pseudo" params={{ pseudo: blocked.pseudo }} className="hover:underline">
                        {name(r.blocked_id)}
                      </Link>
                    ) : (
                      name(r.blocked_id)
                    )}
                  </span>
                  <span className="text-muted-foreground">bloqué par</span>
                  <span className="font-medium">
                    {blocker ? (
                      <Link to="/u/$pseudo" params={{ pseudo: blocker.pseudo }} className="hover:underline">
                        {name(r.blocker_id)}
                      </Link>
                    ) : (
                      name(r.blocker_id)
                    )}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {r.reason ? `Motif : ${r.reason}` : "Aucun motif indiqué."}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
