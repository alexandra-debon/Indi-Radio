import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SocialWall } from "@/components/wall/SocialWall";
import { WallCompact } from "@/components/wall/WallCompact";
import { WallExpandHandle } from "@/components/wall/WallExpandHandle";
import { parseHashTargets } from "@/lib/notif-navigate";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/lib/i18n";
import { ChevronUp, ChevronDown } from "lucide-react";


export function SocialWallPanel() {
  const [expanded, setExpanded] = useState(false);
  const { requireAuth } = useAuth();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const isMobile = useIsMobile();
  const t = useT();

  // Animated overlay lifecycle: keep it mounted through the exit transition.
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const savedScrollY = useRef(0);
  const ANIM_MS = 260;

  // Swipe state
  const [drag, setDrag] = useState(0); // px translate (negative = up, positive = down)
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const axisLocked = useRef<"y" | "x" | null>(null);
  const THRESHOLD = 60;
  const MAX_DRAG = 90;

  useEffect(() => {
    const { primary } = parseHashTargets(hash);
    if (primary && primary.startsWith("post-")) setExpanded(true);
  }, [hash]);

  // Drive enter/exit animations + scroll preservation
  useEffect(() => {
    if (expanded) {
      savedScrollY.current = window.scrollY;
      setOverlayMounted(true);
      // next frame to trigger CSS transition from initial hidden state
      const raf = requestAnimationFrame(() => setOverlayVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setOverlayVisible(false);
      const timer = setTimeout(() => {
        setOverlayMounted(false);
        // Restore page scroll after unmount so user keeps their place
        window.scrollTo({ top: savedScrollY.current, behavior: "auto" });
      }, ANIM_MS);
      return () => clearTimeout(timer);
    }
  }, [expanded]);

  useEffect(() => {
    if (!overlayMounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [overlayMounted]);

  const openPublish = () => {
    requireAuth(() => setExpanded(true));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    axisLocked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent, mode: "compact" | "expanded") => {
    if (!isMobile || startY.current == null || startX.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    const dx = e.touches[0].clientX - startX.current;
    if (!axisLocked.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        axisLocked.current = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      } else return;
    }
    if (axisLocked.current !== "y") return;
    if (mode === "expanded") {
      // Only collapse-on-swipe-down when overlay is scrolled to top
      const el = e.currentTarget as HTMLElement;
      if (el.scrollTop > 0) return;
      if (dy <= 0) return;
      setDragging(true);
      setDrag(Math.min(dy, MAX_DRAG));
    } else {
      if (dy >= 0) return;
      setDragging(true);
      setDrag(Math.max(dy, -MAX_DRAG));
    }
  };

  const onTouchEnd = (mode: "compact" | "expanded") => {
    if (!isMobile) {
      startY.current = null;
      return;
    }
    const passed = Math.abs(drag) >= THRESHOLD;
    if (passed) {
      if (mode === "compact") setExpanded(true);
      else setExpanded(false);
    }
    setDrag(0);
    setDragging(false);
    startY.current = null;
    startX.current = null;
    axisLocked.current = null;
  };

  const passedUp = drag <= -THRESHOLD;
  const passedDown = drag >= THRESHOLD;

  const compactTransform = !expanded && !dragging
    ? `translateY(0)`
    : `translateY(${drag}px)`;
  const compactStyle: React.CSSProperties = {
    transform: compactTransform,
    transition: dragging ? "none" : `transform ${ANIM_MS}ms ease-out, opacity ${ANIM_MS}ms ease-out`,
    opacity: overlayVisible ? 0.4 : 1,
  };

  const overlayStyle: React.CSSProperties = {
    transform: `translateY(${overlayVisible ? drag : 16}px)`,
    opacity: overlayVisible ? 1 : 0,
    transition: dragging
      ? "none"
      : `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${ANIM_MS}ms ease-out`,
    willChange: "transform, opacity",
  };

  return (
    <>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={(e) => onTouchMove(e, "compact")}
        onTouchEnd={() => onTouchEnd("compact")}
        onTouchCancel={() => onTouchEnd("compact")}
        style={compactStyle}
        className="relative touch-pan-y"
        aria-hidden={overlayMounted}
      >
        <WallCompact onExpand={() => setExpanded(true)} onPublish={openPublish} />
        {isMobile && dragging && !expanded && (
          <div
            className={`pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border-2 border-black px-3 py-1 text-[11px] font-bold uppercase shadow-[2px_2px_0_0_#000] transition-colors ${
              passedUp ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <ChevronUp className="size-3" />
              {t("wall.swipeUpHint")}
            </span>
          </div>
        )}
      </div>

      {overlayMounted && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-background touch-pan-y"
          role="dialog"
          aria-modal="true"
          aria-label="Mur social"
          onTouchStart={onTouchStart}
          onTouchMove={(e) => onTouchMove(e, "expanded")}
          onTouchEnd={() => onTouchEnd("expanded")}
          onTouchCancel={() => onTouchEnd("expanded")}
          style={overlayStyle}
        >
          <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-background/80 px-4 py-2 backdrop-blur-sm sm:py-3">
            <WallExpandHandle
              direction="up"
              onClick={() => setExpanded(false)}
              label={t("wall.collapse")}
            />
            <span className="hidden text-xs font-bold uppercase tracking-wide text-muted-foreground sm:inline">
              {t("wall.title")}
            </span>
          </div>
          {isMobile && dragging && (
            <div
              className={`pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border-2 border-black px-3 py-1 text-[11px] font-bold uppercase shadow-[2px_2px_0_0_#000] transition-colors ${
                passedDown ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ChevronDown className="size-3" />
                {t("wall.swipeDownHint")}
              </span>
            </div>
          )}
          <div className="mx-auto max-w-3xl px-3 pb-32 sm:px-6">
            <SocialWall />
          </div>

        </div>
      )}

    </>
  );
}