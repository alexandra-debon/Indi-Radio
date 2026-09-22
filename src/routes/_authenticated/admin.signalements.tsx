import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, Flag, RefreshCw, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/signalements")({
  head: () => ({
    meta: [{ title: "Signalements — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminReportsPage,
});

type Source = "comment_reports" | "image_reports" | "album_reports";

type Report = {
  id: string;
  source: Source;
  kind: string;
  targetId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: string;
  imageUrl?: string | null;
};

type MiniProfile = { id: string; pseudo: string; stage_name: string | null; avatar_url: string | null };

const KIND_LABEL: Record<string, string> = {
  content_comment: "Commentaire",
  news_comment: "Commentaire actu",
  post_comment: "Commentaire publication",
  post: "Publication du mur",
  village_post: "Article RéDaK'Village",
  teevi_video: "Vidéo InDi TeeVi",
  profile: "Profil membre",
  shop_item: "Objet boutique",
  image: "Photo",
  album: "Album photo",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  resolved: "Traité",
  rejected: "Rejeté",
};

function AdminReportsPage() {
  const { isAdmin, session } = useAuth();
  const [rows, setRows] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "resolved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [c, i, a] = await Promise.all([
      (supabase as any)
        .from("comment_reports")
        .select("id, reporter_id, comment_type, comment_id, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      (supabase as any)
        .from("image_reports")
        .select("id, reporter_id, post_id, image_url, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      (supabase as any)
        .from("album_reports")
        .select("id, reporter_id, album_id, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    const err = c.error || i.error || a.error;
    if (err) {
      setLoading(false);
      toast.error(err.message);
      return;
    }
    const list: Report[] = [
      ...((c.data ?? []) as any[]).map((r) => ({
        id: r.id,
        source: "comment_reports" as Source,
        kind: r.comment_type,
        targetId: r.comment_id,
        reporterId: r.reporter_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })),
      ...((i.data ?? []) as any[]).map((r) => ({
        id: r.id,
        source: "image_reports" as Source,
        kind: "image",
        targetId: r.post_id,
        reporterId: r.reporter_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        imageUrl: r.image_url,
      })),
      ...((a.data ?? []) as any[]).map((r) => ({
        id: r.id,
        source: "album_reports" as Source,
        kind: "album",
        targetId: r.album_id,
        reporterId: r.reporter_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })),
    ].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
    setRows(list);

    const ids = Array.from(new Set(list.map((r) => r.reporterId)));
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

  async function setStatusOf(r: Report, next: "resolved" | "rejected") {
    const patch: Record<string, unknown> = { status: next, resolved_at: new Date().toISOString() };
    if (session?.user.id) patch.resolved_by = session.user.id;
    const { error } = await (supabase as any).from(r.source).update(patch).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    toast.success(next === "resolved" ? "Signalement traité" : "Signalement rejeté");
  }

  async function remove(r: Report) {
    if (!confirm("Supprimer définitivement ce signalement ?")) return;
    const { error } = await (supabase as any).from(r.source).delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Signalement supprimé");
  }

  const name = (id: string) => {
    const p = profiles[id];
    return p ? p.stage_name || p.pseudo : id.slice(0, 8);
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (!q) return true;
        return [name(r.reporterId), r.reason, KIND_LABEL[r.kind] ?? r.kind].some((v) =>
          v.toLowerCase().includes(q),
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, profiles, q, status],
  );

  const counts = useMemo(() => {
    const byKind = new Map<string, number>();
    let pending = 0;
    for (const r of rows) {
      byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
      if (r.status === "pending") pending += 1;
    }
    return { pending, byKind: [...byKind.entries()].sort((a, b) => b[1] - a[1]) };
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
        <Flag className="size-7 text-destructive" /> Signalements
      </h1>
      <p className="mt-1 text-muted-foreground">
        {rows.length} signalement(s) au total, dont {counts.pending} en attente — publications,
        commentaires, profils, photos et albums.
      </p>

      {counts.byKind.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Répartition par type de contenu</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {counts.byKind.map(([kind, n]) => (
              <li key={kind}>
                {KIND_LABEL[kind] ?? kind} — {n}
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
          placeholder="Rechercher un motif, un membre, un type…"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
        />
        {(["pending", "resolved", "rejected", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s === "all" ? "Tous" : STATUS_LABEL[s]}
          </Button>
        ))}
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
          Aucun signalement à afficher.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((r) => {
            const reporter = profiles[r.reporterId];
            return (
              <li key={`${r.source}-${r.id}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                    {KIND_LABEL[r.kind] ?? r.kind}
                  </span>
                  <span
                    className={
                      r.status === "pending"
                        ? "rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"
                        : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-muted-foreground">signalé par</span>
                  <span className="font-medium">
                    {reporter ? (
                      <Link to="/u/$pseudo" params={{ pseudo: reporter.pseudo }} className="hover:underline">
                        {name(r.reporterId)}
                      </Link>
                    ) : (
                      name(r.reporterId)
                    )}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>

                <p className="mt-2 text-sm">Motif : {r.reason}</p>

                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt="Photo signalée"
                    className="mt-2 max-h-40 rounded-lg border border-border object-cover"
                  />
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.kind === "post" || r.kind === "image" ? (
                    <Link to="/p/$postId" params={{ postId: r.targetId }} className="text-xs underline">
                      Voir la publication
                    </Link>
                  ) : null}
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void setStatusOf(r, "resolved")}>
                        <Check className="mr-1 size-4" /> Marquer traité
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void setStatusOf(r, "rejected")}>
                        <X className="mr-1 size-4" /> Rejeter
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void remove(r)}>
                    <Trash2 className="mr-1 size-4" /> Supprimer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
