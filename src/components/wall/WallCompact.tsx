import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { WallExpandHandle } from "@/components/wall/WallExpandHandle";
import { useT, useLang } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { renderRich } from "@/lib/rich-text";
import { stripMediaUrls } from "@/lib/media-embed";
import { Heart, MessageCircle, Pin, PenSquare, Image as ImageIcon } from "lucide-react";
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
          <div className="card-brut p-4 text-center text-sm text-muted-foreground">
            {t("wall.compactEmpty")}
          </div>
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
                    · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
                {p.title && (
                  <div className="line-clamp-1 text-sm font-bold">{renderRich(p.title)}</div>
                )}
                {bodyText && (
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {renderRich(bodyText)}
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

    </section>

  );
}