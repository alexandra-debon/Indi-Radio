import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { WallExpandHandle } from "@/components/wall/WallExpandHandle";
import { useT, useLang } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Link } from "@tanstack/react-router";
import { renderRich } from "@/lib/rich-text";
import { parseMediaUrl, stripMediaUrls } from "@/lib/media-embed";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { Heart, MessageCircle, Pin, PenSquare, Newspaper } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface CompactPost {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  created_at: string;
  pinned_at: string | null;
  pin_label: string | null;
  image_urls: string[] | null;
  image_url: string | null;
  author: {
    id: string;
    pseudo: string;
    role: "admin" | "artiste" | "animateur" | "auditeur";
    is_certified: boolean;
    is_team_indi: boolean;
    badges: string[];
    level: number;
  } | null;
}

export function WallCompact({
  onExpand,
  onPublish,
}: {
  onExpand: () => void;
  onPublish: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "en" ? enUS : fr;
  const qc = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ["wall-compact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, author_id, title, content, created_at, pinned_at, pin_label, image_urls, image_url, author:profiles!posts_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)",
        )
        .eq("visibility", "feed")
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as unknown as CompactPost[];
    },
    staleTime: 30_000,
  });

  const { data: counts = {} } = useQuery<Record<string, { likes: number; comments: number }>>({
    queryKey: ["wall-compact-counts", posts.map((p) => p.id).join(",")],
    enabled: posts.length > 0,
    queryFn: async () => {
      const ids = posts.map((p) => p.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      const map: Record<string, { likes: number; comments: number }> = {};
      ids.forEach((id) => (map[id] = { likes: 0, comments: 0 }));
      (likes ?? []).forEach((r: any) => map[r.post_id] && map[r.post_id].likes++);
      (comments ?? []).forEach((r: any) => map[r.post_id] && map[r.post_id].comments++);
      return map;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("wall-compact-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-compact"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-compact-counts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-compact-counts"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="section-title">{t("wall.compactTitle")}</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onPublish}
            className="gap-1.5 bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000] border-2 border-black hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <PenSquare className="size-4" />
            {t("wall.publish")}
          </Button>
          <WallExpandHandle
            direction="down"
            onClick={onExpand}
            label={t("wall.expand")}
            aria-expanded={false}
          />
        </div>
      </div>

      <div className="space-y-2">
        {posts.length === 0 && (
          <button
            type="button"
            onClick={onExpand}
            className="card-brut w-full p-4 text-center text-sm text-muted-foreground transition hover:-translate-y-0.5 hover:bg-primary/5"
          >
            {t("wall.compactEmpty")}
          </button>
        )}
        {posts.map((p) => {
          const cover = (p.image_urls && p.image_urls[0]) || p.image_url;
          const bodyText = stripMediaUrls(p.content || "").trim();
          const c = counts[p.id] ?? { likes: 0, comments: 0 };
          return (
            <button
              key={p.id}
              type="button"
              onClick={onExpand}
              className="card-brut flex w-full items-start gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:bg-primary/5"
            >
              {cover && (
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-16 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {p.pinned_at && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-1.5 py-0.5 font-bold uppercase text-primary">
                      <Pin className="size-3" />
                      {p.pin_label || t("wall.pinned")}
                    </span>
                  )}
                  {p.author && <UserBadge profile={p.author} compact />}
                  <span className="text-muted-foreground">
                    ·{" "}
                    {formatDistanceToNow(new Date(p.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>
                {p.title && (
                  <div className="line-clamp-1 text-sm font-bold">
                    <TranslatedText entityType="post" entityKey={p.id} field="title" text={p.title}>
                      {(tt) => <>{renderRich(tt)}</>}
                    </TranslatedText>
                  </div>
                )}
                {bodyText && (
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    <TranslatedText
                      entityType="post"
                      entityKey={p.id}
                      field="content"
                      text={bodyText}
                    >
                      {(tt) => <>{renderRich(tt)}</>}
                    </TranslatedText>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" /> {c.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" /> {c.comments}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <FeedTeasers />

      <button
        type="button"
        onClick={onExpand}
        className="w-full rounded-lg border-2 border-black bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5 hover:bg-primary/20"
      >
        {t("wall.seeAll")}
      </button>
    </section>
  );
}
/** Vignette YouTube d'un clip, pour que la carte teaser ait une image. */
function clipThumb(url: string | null): string | null {
  if (!url) return null;
  const m = parseMediaUrl(url);
  if (m && m.kind === "youtube" && m.type === "video") {
    return `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`;
  }
  return null;
}

type TeaserKind = "village" | "news" | "clip" | "review";

interface Teaser {
  kind: TeaserKind;
  id: string;
  title: string;
  excerpt: string;
  cover: string | null;
  date: string;
}

const TEASER_LABEL: Record<TeaserKind, { fr: string; en: string }> = {
  village: { fr: "RéDaK'Village", en: "RéDaK'Village" },
  news: { fr: "Blog InDi ArT CulTuRe", en: "InDi ArT CulTuRe Blog" },
  clip: { fr: "Clip Addict", en: "Clip Addict" },
  review: { fr: "Chronique", en: "Album review" },
};

/**
 * Cartes teaser des contenus éditoriaux et communautaires publiés
 * récemment : elles renvoient vers la page complète, jamais vers le mur.
 */
function FeedTeasers() {
  const { lang } = useLang();
  const dateLocale = lang === "en" ? enUS : fr;
  const key = lang === "en" ? "en" : "fr";

  const { data: items = [] } = useQuery<Teaser[]>({
    queryKey: ["wall-compact-teasers"],
    staleTime: 60_000,
    queryFn: async () => {
      const [village, news, clips, reviews] = await Promise.all([
        supabase
          .from("village_articles")
          .select("slug, title, excerpt, content, cover_url, created_at")
          .eq("published", true)
          .eq("visibility", "feed")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("news_posts")
          .select("id, title, content, image_url, created_at")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("clip_entries")
          .select("id, title, body, video_url, video_urls, created_at")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("album_reviews")
          .select("slug, title, artist, excerpt, cover_url, created_at")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);
      const out: Teaser[] = [];
      for (const r of village.data ?? []) {
        out.push({
          kind: "village",
          id: r.slug,
          title: r.title,
          excerpt: (r.excerpt || r.content || "").slice(0, 180),
          cover: r.cover_url,
          date: r.created_at,
        });
      }
      for (const r of news.data ?? []) {
        out.push({
          kind: "news",
          id: r.id,
          title: r.title,
          excerpt: stripMediaUrls(r.content || "").slice(0, 180),
          cover: r.image_url,
          date: r.created_at,
        });
      }
      for (const r of clips.data ?? []) {
        out.push({
          kind: "clip",
          id: r.id,
          title: r.title,
          excerpt: stripMediaUrls(r.body || "").slice(0, 180),
          cover: clipThumb(r.video_url ?? r.video_urls?.[0] ?? null),
          date: r.created_at,
        });
      }
      for (const r of reviews.data ?? []) {
        out.push({
          kind: "review",
          id: r.slug,
          title: `${r.artist} — ${r.title}`,
          excerpt: (r.excerpt || "").slice(0, 180),
          cover: r.cover_url,
          date: r.created_at,
        });
      }
      return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    },
  });

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <TeaserCard
          key={`${it.kind}-${it.id}`}
          item={it}
          label={TEASER_LABEL[it.kind][key]}
          locale={dateLocale}
        />
      ))}
    </div>
  );
}

function TeaserCard({ item, label, locale }: { item: Teaser; label: string; locale: Locale }) {
  const inner = (
    <>
      {item.cover && (
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-16 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 border-2 border-black bg-primary px-1.5 py-0.5 font-black uppercase tracking-widest text-black">
            <Newspaper className="size-3" /> {label}
          </span>
          <span className="text-muted-foreground">
            · {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale })}
          </span>
        </div>
        <div className="line-clamp-2 text-sm font-bold">{item.title}</div>
        {item.excerpt && (
          <div className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</div>
        )}
      </div>
    </>
  );
  const cls =
    "card-brut flex w-full items-start gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:bg-primary/5";

  if (item.kind === "village")
    return (
      <Link to="/redak-village/$slug" params={{ slug: item.id }} className={cls}>
        {inner}
      </Link>
    );
  if (item.kind === "news")
    return (
      <Link to="/actus/$postId" params={{ postId: item.id }} className={cls}>
        {inner}
      </Link>
    );
  if (item.kind === "clip")
    return (
      <Link to="/clips/$clipId" params={{ clipId: item.id }} className={cls}>
        {inner}
      </Link>
    );
  return (
    <Link to="/chroniques/$slug" params={{ slug: item.id }} className={cls}>
      {inner}
    </Link>
  );
}
