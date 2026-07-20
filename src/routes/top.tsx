import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, Star, Trophy, Medal, Headphones, Disc3 } from "lucide-react";
import { ContentCommentsSection, ContentLikeButton } from "@/components/content/ContentReactions";
import { useT } from "@/lib/i18n";

// Fixed UUID identifying the /top discussion thread
const TOP_THREAD_ID = "00000000-0000-4000-8000-000000000t0p".replace(/[^0-9a-f-]/gi, "0");

export const Route = createFileRoute("/top")({
  head: () => ({
    meta: [
      { title: "Top — Podcasts & Chroniques les mieux notés | Indi Radio" },
      { name: "description", content: "Les podcasts et chroniques d'albums les mieux notés et les plus likés sur Indi Radio." },
      { property: "og:title", content: "Top — Indi Radio" },
      { property: "og:description", content: "Podcasts et chroniques préférés des auditeurs." },
    ],
  }),
  component: TopPage,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Introuvable.</div>,
});

type Kind = "podcast" | "album_review";
type Metric = "rating" | "likes";

type Row = {
  id: string;
  kind: Kind;
  title: string;
  subtitle?: string | null;
  cover_url?: string | null;
  slug?: string | null;
  avg?: number;
  count?: number;
  likes?: number;
};

async function fetchTop(metric: Metric): Promise<Row[]> {
  // Aggregate on the client — dataset is small (single-station app).
  const [ratings, likes, podcasts, reviews] = await Promise.all([
    supabase.from("content_ratings").select("content_type, content_id, stars").in("content_type", ["podcast", "album_review"]),
    supabase.from("content_likes").select("content_type, content_id").in("content_type", ["podcast", "album_review"]),
    supabase.from("podcasts").select("id, title, description, cover_url"),
    supabase.from("album_reviews").select("id, slug, title, artist, cover_url, published").eq("published", true),
  ]);
  if (ratings.error) throw ratings.error;
  if (likes.error) throw likes.error;
  if (podcasts.error) throw podcasts.error;
  if (reviews.error) throw reviews.error;

  const ratingAgg = new Map<string, { sum: number; count: number }>();
  for (const r of ratings.data ?? []) {
    const k = `${r.content_type}:${r.content_id}`;
    const cur = ratingAgg.get(k) ?? { sum: 0, count: 0 };
    cur.sum += r.stars ?? 0;
    cur.count += 1;
    ratingAgg.set(k, cur);
  }
  const likeAgg = new Map<string, number>();
  for (const l of likes.data ?? []) {
    const k = `${l.content_type}:${l.content_id}`;
    likeAgg.set(k, (likeAgg.get(k) ?? 0) + 1);
  }

  const rows: Row[] = [];
  for (const p of podcasts.data ?? []) {
    const k = `podcast:${p.id}`;
    const r = ratingAgg.get(k);
    rows.push({
      id: p.id, kind: "podcast", title: p.title, subtitle: p.description, cover_url: p.cover_url,
      avg: r ? r.sum / r.count : 0, count: r?.count ?? 0, likes: likeAgg.get(k) ?? 0,
    });
  }
  for (const a of reviews.data ?? []) {
    const k = `album_review:${a.id}`;
    const r = ratingAgg.get(k);
    rows.push({
      id: a.id, kind: "album_review", title: a.title, subtitle: a.artist, cover_url: a.cover_url, slug: a.slug,
      avg: r ? r.sum / r.count : 0, count: r?.count ?? 0, likes: likeAgg.get(k) ?? 0,
    });
  }

  const filtered = metric === "rating"
    ? rows.filter((x) => (x.count ?? 0) > 0).sort((a, b) => (b.avg! - a.avg!) || ((b.count ?? 0) - (a.count ?? 0)))
    : rows.filter((x) => (x.likes ?? 0) > 0).sort((a, b) => (b.likes! - a.likes!));

  return filtered.slice(0, 25);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-5 text-primary" />;
  if (rank <= 3) return <Medal className="size-5 text-primary/70" />;
  return <span className="w-5 text-center text-sm text-muted-foreground">{rank}</span>;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3.5 ${i <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}

function linkFor(row: Row) {
  if (row.kind === "podcast") return { to: "/podcasts" as const };
  return { to: "/chroniques/$slug" as const, params: { slug: row.slug ?? row.id } };
}

function TopList({ metric }: { metric: Metric }) {
  const t = useT();
  const { data = [], isLoading } = useQuery({
    queryKey: ["top-content", metric],
    queryFn: () => fetchTop(metric),
  });
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (data.length === 0) return <div className="card-brut p-4 text-center text-sm text-muted-foreground">{metric === "rating" ? t("page.top.emptyRatings") : t("page.top.emptyLikes")}</div>;
  return (
    <ol className="space-y-2">
      {data.map((row, i) => {
        const l = linkFor(row);
        return (
          <li key={`${row.kind}-${row.id}`} className="card-brut flex items-center gap-3 p-3">
            <div className="grid size-8 place-items-center"><RankIcon rank={i + 1} /></div>
            {row.cover_url ? (
              <img src={row.cover_url} alt="" loading="lazy" className="size-12 rounded object-cover" />
            ) : (
              <div className="grid size-12 place-items-center rounded bg-muted">
                {row.kind === "podcast" ? <Headphones className="size-5" /> : <Disc3 className="size-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link {...(l as any)} className="block truncate text-sm font-semibold hover:underline">{row.title}</Link>
              {row.subtitle && <div className="truncate text-xs text-muted-foreground">{row.subtitle}</div>}
              <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {row.kind === "podcast" ? "Podcast" : "Chronique"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Stars value={row.avg ?? 0} />
                <span className="text-xs text-muted-foreground tabular-nums">({row.count ?? 0})</span>
              </div>
              <div className="flex items-center gap-1" title="Likes">
                <Heart className="size-4 fill-primary text-primary" />
                <span className="font-bold tabular-nums">{row.likes ?? 0}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TopPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t("page.top.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("page.top.subtitle")}</p>
      </div>
      <Tabs defaultValue="rating">
        <TabsList>
          <TabsTrigger value="rating"><Star className="mr-1 size-4" /> Mieux notés</TabsTrigger>
          <TabsTrigger value="likes"><Heart className="mr-1 size-4" /> Plus likés</TabsTrigger>
        </TabsList>
        <TabsContent value="rating" className="mt-4"><TopList metric="rating" /></TabsContent>
        <TabsContent value="likes" className="mt-4"><TopList metric="likes" /></TabsContent>
      </Tabs>

      <section className="card-brut space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black tracking-tight">{t("page.top.discussion")}</h2>
          <ContentLikeButton contentType="top" contentId={TOP_THREAD_ID} />
        </div>
        <p className="text-xs text-muted-foreground">{t("page.top.discussSub")}</p>
        <ContentCommentsSection contentType="top" contentId={TOP_THREAD_ID} />
      </section>
    </div>
  );
}