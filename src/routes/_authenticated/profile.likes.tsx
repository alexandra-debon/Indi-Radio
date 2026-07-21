import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Disc3, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/rating/StarRating";

export const Route = createFileRoute("/_authenticated/profile/likes")({
  head: () => ({
    meta: [
      { title: "Mes likes — Coups de Cœur InDi RaDiO" },
      { name: "description", content: "Retrouve les coups de cœur que tu as aimés." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyLikesPage,
});

type Row = {
  liked_at: string;
  id: string;
  featured_date: string;
  cover_url: string | null;
  artist: string;
  title: string;
  kind: string;
  comment: string;
  editorial_rating: number | null;
  likes_count: number;
};

type Kind = "all" | "single" | "ep" | "album";
type Sort = "liked_desc" | "date_desc" | "rating_desc" | "popular_desc";

function fmt(d: string) {
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

function MyLikesPage() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("all");
  const [sort, setSort] = useState<Sort>("liked_desc");

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`my-likes-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coup_de_coeur_likes", filter: `user_id=eq.${uid}` },
        () => qc.invalidateQueries({ queryKey: ["my-liked-coups", uid] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, qc]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-liked-coups", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data: myLikes, error } = await supabase
        .from("coup_de_coeur_likes" as any)
        .select("coup_id, created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (myLikes ?? []) as unknown as { coup_id: string; created_at: string }[];
      if (list.length === 0) return [] as Row[];
      const ids = list.map((l) => l.coup_id);
      const [{ data: coups }, { data: allLikes }] = await Promise.all([
        supabase
          .from("coups_de_coeur" as any)
          .select("id, featured_date, cover_url, artist, title, kind, comment, editorial_rating, published")
          .in("id", ids),
        supabase.from("coup_de_coeur_likes" as any).select("coup_id").in("coup_id", ids),
      ]);
      const counts = new Map<string, number>();
      for (const l of (allLikes ?? []) as unknown as { coup_id: string }[]) {
        counts.set(l.coup_id, (counts.get(l.coup_id) ?? 0) + 1);
      }
      const likedAtBy = new Map(list.map((l) => [l.coup_id, l.created_at]));
      return ((coups ?? []) as any[])
        .filter((c) => c.published !== false)
        .map<Row>((c) => ({
          id: c.id,
          featured_date: c.featured_date,
          cover_url: c.cover_url,
          artist: c.artist,
          title: c.title,
          kind: c.kind,
          comment: c.comment,
          editorial_rating: c.editorial_rating,
          likes_count: counts.get(c.id) ?? 0,
          liked_at: likedAtBy.get(c.id) ?? c.featured_date,
        }));
    },
  });

  const filtered = useMemo(() => {
    const arr = kind === "all" ? [...rows] : rows.filter((r) => r.kind === kind);
    arr.sort((a, b) => {
      switch (sort) {
        case "date_desc": return b.featured_date.localeCompare(a.featured_date);
        case "rating_desc": return (b.editorial_rating ?? 0) - (a.editorial_rating ?? 0) || b.liked_at.localeCompare(a.liked_at);
        case "popular_desc": return b.likes_count - a.likes_count || b.liked_at.localeCompare(a.liked_at);
        default: return b.liked_at.localeCompare(a.liked_at);
      }
    });
    return arr;
  }, [rows, kind, sort]);

  async function unlike(coupId: string) {
    if (!uid) return;
    await supabase.from("coup_de_coeur_likes" as any).delete().eq("coup_id", coupId).eq("user_id", uid);
    qc.invalidateQueries({ queryKey: ["my-liked-coups", uid] });
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="section-title flex items-center gap-2">
          <Heart className="size-6 fill-primary text-primary" />
          Mes likes
        </h1>
        <p className="text-sm text-muted-foreground">
          Retrouve tes coups de cœur InDi RaDiO préférés, filtre-les et trie-les à ta façon.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Format</span>
          {(["all", "single", "ep", "album"] as Kind[]).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
              {k === "all" ? "Tous" : k === "single" ? "Chansons" : k === "ep" ? "EP" : "Albums"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trier par</span>
          {([
            ["liked_desc", "Liké récemment"],
            ["date_desc", "Publication récente"],
            ["rating_desc", "Note rédaction"],
            ["popular_desc", "Populaires"],
          ] as [Sort, string][]).map(([s, label]) => (
            <Button key={s} size="sm" variant={sort === s ? "default" : "outline"} onClick={() => setSort(s)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <div className="card-brut p-4 text-sm text-muted-foreground">Chargement…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="card-brut p-6 text-center text-sm text-muted-foreground">
          Aucun coup de cœur liké pour l'instant.{" "}
          <Link to="/coups-de-coeur" className="text-primary underline">Découvre-les</Link>.
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((c) => (
          <li key={c.id} className="card-brut p-3">
            <div className="flex gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted sm:size-24">
                {c.cover_url ? (
                  <img src={c.cover_url} alt={`${c.title} — ${c.artist}`} loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center"><Disc3 className="size-8 text-muted-foreground" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {c.kind === "single" ? "Chanson" : c.kind === "ep" ? "EP" : "Album"}
                </div>
                <h2 className="truncate text-base font-bold leading-tight">{c.title}</h2>
                <div className="truncate text-xs text-muted-foreground">
                  par <span className="font-medium text-foreground">{c.artist}</span>
                </div>
                {c.editorial_rating != null && c.editorial_rating > 0 && (
                  <div className="mt-1"><StarRating value={c.editorial_rating} size={14} /></div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Heart className="size-3 fill-primary text-primary" />{c.likes_count}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{fmt(c.featured_date)}</span>
                  <span>· Liké le {fmt(c.liked_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/coups-de-coeur">Voir sur la page</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => unlike(c.id)} className="text-destructive">
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}