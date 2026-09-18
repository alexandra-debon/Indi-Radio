import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, ExternalLink, Eye, EyeOff, Mic2, Newspaper, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/artistes")({
  head: () => ({
    meta: [{ title: "Artistes certifiés — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminArtistsPage,
});

type ArtistRow = {
  id: string;
  pseudo: string;
  stage_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_certified: boolean;
  page_indexable: boolean | null;
  banner_url: string | null;
  banner_color: string | null;
  created_at: string;
};

const SELECT_COLS =
  "id, pseudo, stage_name, avatar_url, role, is_certified, page_indexable, banner_url, banner_color, created_at";

function AdminArtistsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<ArtistRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "indexed" | "hidden">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select(SELECT_COLS)
      .or("role.in.(artiste,media),is_certified.eq.true")
      .order("stage_name", { ascending: true, nullsFirst: false })
      .order("pseudo", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as ArtistRow[]);
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((a) => {
        if (filter === "indexed" && a.page_indexable === false) return false;
        if (filter === "hidden" && a.page_indexable !== false) return false;
        if (!q) return true;
        return [a.pseudo, a.stage_name ?? ""].some((v) => v.toLowerCase().includes(q));
      }),
    [rows, q, filter],
  );

  const hiddenCount = rows.filter((a) => a.page_indexable === false).length;

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
      <h1 className="text-3xl font-black">Artistes certifiés</h1>
      <p className="mt-1 text-muted-foreground">
        Suivi de la visibilité des pages artistes : {rows.length} profil(s), dont {hiddenCount} non
        référencé(s) sur les moteurs.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Tous ({rows.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "indexed" ? "default" : "outline"}
          onClick={() => setFilter("indexed")}
        >
          <Eye className="mr-1 size-4" /> Référencés ({rows.length - hiddenCount})
        </Button>
        <Button
          size="sm"
          variant={filter === "hidden" ? "default" : "outline"}
          onClick={() => setFilter("hidden")}
        >
          <EyeOff className="mr-1 size-4" /> Non référencés ({hiddenCount})
        </Button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un pseudo ou un nom de scène…"
          className="ml-auto h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Aucun artiste ne correspond à ce filtre.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              {a.avatar_url ? (
                <img src={a.avatar_url} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="size-10 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{a.stage_name || a.pseudo}</span>
                  {a.is_certified && <BadgeCheck className="size-4 shrink-0 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{a.pseudo}
                  {a.role ? ` · ${a.role === "media" ? "Média" : a.role === "artiste" ? "Artiste" : a.role}` : ""}
                  {a.created_at
                    ? ` · membre depuis le ${new Date(a.created_at).toLocaleDateString("fr-FR")}`
                    : ""}
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] uppercase ${
                  a.role === "media"
                    ? "border-secondary text-secondary"
                    : "border-primary text-primary"
                }`}
              >
                {a.role === "media" ? <Newspaper className="size-3" /> : <Mic2 className="size-3" />}
                {a.role === "media" ? "Média" : "Artiste"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] uppercase ${
                  a.page_indexable === false
                    ? "border-destructive text-destructive"
                    : "border-border text-muted-foreground"
                }`}
              >
                {a.page_indexable === false ? (
                  <>
                    <EyeOff className="size-3" /> Non référencé
                  </>
                ) : (
                  <>
                    <Eye className="size-3" /> Référencé
                  </>
                )}
              </span>

              <div className="ml-auto">
                <Button asChild size="sm" variant="outline">
                  <Link to="/u/$pseudo" params={{ pseudo: a.pseudo }}>
                    <ExternalLink className="mr-1 size-4" /> Voir la page
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
