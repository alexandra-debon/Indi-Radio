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
import { Heart, MessageCircle, Pin, PenSquare, Image as ImageIcon, X, Hand } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

// Bump this value when the wall gesture/UI changes to re-show the tooltip + demo.
const WALL_TOOLTIP_VERSION = "3";
const WALL_TOOLTIP_KEY = "indi-wall-tooltip-dismissed";
const WALL_TOOLTIP_VERSION_KEY = "indi-wall-tooltip-version";
const WALL_DEMO_VERSION_KEY = "indi-wall-demo-version";
const DEMO_DURATION_MS = 3200;

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
  const isMobile = useIsMobile();

  const [showTooltip, setShowTooltip] = useState(false);
  const [demoPhase, setDemoPhase] = useState<"idle" | "playing" | "done">("idle");
  const hasInitializedRef = useRef(false);
  const handleWrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [arrowRight, setArrowRight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (typeof window === "undefined") return;
    hasInitializedRef.current = true;

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const dismissed = localStorage.getItem(WALL_TOOLTIP_KEY) === "1";
      const storedVersion = localStorage.getItem(WALL_TOOLTIP_VERSION_KEY);
      const shouldShow = !dismissed || storedVersion !== WALL_TOOLTIP_VERSION;
      if (!shouldShow) return;

      const isMobileNow = window.innerWidth < 768;
      const demoVersionSeen = localStorage.getItem(WALL_DEMO_VERSION_KEY);
      if (isMobileNow && demoVersionSeen !== WALL_TOOLTIP_VERSION) {
        localStorage.setItem(WALL_DEMO_VERSION_KEY, WALL_TOOLTIP_VERSION);
        setDemoPhase("playing");
        timer = setTimeout(() => {
          setDemoPhase("done");
          setShowTooltip(true);
        }, DEMO_DURATION_MS);
      } else {
        setShowTooltip(true);
      }
    } catch {
      // ignore
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismissTooltip = () => {
    try {
      localStorage.setItem(WALL_TOOLTIP_KEY, "1");
      localStorage.setItem(WALL_TOOLTIP_VERSION_KEY, WALL_TOOLTIP_VERSION);
    } catch {
      // ignore
    }
    setShowTooltip(false);
  };

  const syncArrow = useCallback(() => {
    if (!handleWrapRef.current || !tooltipRef.current) return;
    const handleRect = handleWrapRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    // Center of the handle relative to the tooltip's left edge.
    const targetCenter = handleRect.left + handleRect.width / 2 - tooltipRect.left;
    // Arrow is 16px wide; place its center over the handle center.
    const nextRight = tooltipRect.width - targetCenter - 8;
    // Clamp to keep the arrow visually inside the tooltip.
    const clamped = Math.max(12, Math.min(tooltipRect.width - 28, nextRight));
    setArrowRight(clamped);
  }, []);

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

  useEffect(() => {
    if (!showTooltip) return;
    syncArrow();
    const onResize = () => syncArrow();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [showTooltip, syncArrow]);

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
          <div ref={handleWrapRef} className="relative">
            <WallExpandHandle
              direction="down"
              onClick={onExpand}
              label={t("wall.expand")}
              aria-expanded={false}
              disabled={demoPhase === "playing"}
            />
            {demoPhase === "playing" && isMobile && (
              <div
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
                aria-hidden="true"
              >
                <div className="relative flex flex-col items-center">
                  <div className="animate-swipe-up-demo">
                    <div className="rounded-full border-2 border-black bg-primary p-2.5 text-primary-foreground shadow-[2px_2px_0_0_#000]">
                      <Hand className="size-6" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 h-10 w-0.5 rounded-full bg-primary/30" />
                </div>
              </div>
            )}
            {showTooltip && (
              <div
                ref={tooltipRef}
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 animate-fade-in sm:w-72"
              >
                <div className="relative rounded-xl border-2 border-black bg-primary p-3 text-primary-foreground shadow-[3px_3px_0_0_#000]">
                  <div
                    className="absolute -top-2 h-4 w-4 rotate-45 border-l-2 border-t-2 border-black bg-primary transition-none"
                    style={{ right: arrowRight ?? 32 }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-wide">
                        {t("wall.tooltip.title")}
                      </p>
                      <p className="text-xs font-medium leading-snug">
                        {isMobile
                          ? `${t("wall.tooltip.swipe")} ${t("wall.tooltip.handle")}`
                          : t("wall.tooltip.handle")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissTooltip}
                      className="shrink-0 rounded-full border border-black/20 p-1 hover:bg-black/10"
                      aria-label={t("action.close")}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={dismissTooltip}
                    className="mt-2 w-full rounded-full border-2 border-black bg-background py-1.5 text-xs font-bold uppercase text-foreground shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5"
                  >
                    {t("wall.tooltip.gotIt")}
                  </button>
                </div>
              </div>
            )}
          </div>
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
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-16 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
                  <ImageIcon className="size-5" />
                </div>
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