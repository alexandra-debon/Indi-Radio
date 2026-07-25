import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SocialWall } from "@/components/wall/SocialWall";
import { WallCompact } from "@/components/wall/WallCompact";
import { WallExpandHandle } from "@/components/wall/WallExpandHandle";
import { parseHashTargets } from "@/lib/notif-navigate";
import { useT } from "@/lib/i18n";


export function SocialWallPanel() {
  const [expanded, setExpanded] = useState(false);
  const { requireAuth } = useAuth();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const t = useT();

  // Animated overlay lifecycle: keep it mounted through the exit transition.
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const savedScrollY = useRef(0);
  const ANIM_MS = 260;

  // Bottom bar height is published as --app-bottom-bar-h by AppShell and
  // kept in sync with the real MiniPlayer + footer + safe-area height.

  useEffect(() => {
    const { primary } = parseHashTargets(hash);
    if (primary && primary.startsWith("post-")) setExpanded(true);
  }, [hash]);

  // Deep-link: `/?mention=<pseudo>` should expand the panel so SocialWall
  // can pick up the param and prefill the composer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mention")) setExpanded(true);
  }, []);

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

  const compactStyle: React.CSSProperties = {
    transition: `opacity ${ANIM_MS}ms ease-out`,
    opacity: overlayVisible ? 0.4 : 1,
  };

  const overlayStyle: React.CSSProperties = {
    transform: `translateY(${overlayVisible ? 0 : 16}px)`,
    opacity: overlayVisible ? 1 : 0,
    transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${ANIM_MS}ms ease-out`,
    willChange: "transform, opacity",
  };

  return (
    <>
      <div
        style={compactStyle}
        className="relative"
        aria-hidden={overlayMounted}
      >
        <WallCompact onExpand={() => setExpanded(true)} onPublish={openPublish} />
      </div>

      {overlayMounted && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="Mur social"
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
          <div
            className="mx-auto max-w-3xl px-3 sm:px-6"
            style={{ paddingBottom: "calc(var(--app-bottom-bar-h, 140px) + 96px)" }}
          >
            <SocialWall />
          </div>

          <div
            className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
            style={{
              bottom: "calc(var(--app-bottom-bar-h, 140px) + 12px)",
            }}
          >
            <div className="pointer-events-auto">
              <WallExpandHandle
                direction="up"
                onClick={() => setExpanded(false)}
                label={t("wall.collapse")}
              />
            </div>
          </div>

        </div>
      )}

    </>
  );
}