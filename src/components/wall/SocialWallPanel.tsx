import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SocialWall } from "@/components/wall/SocialWall";
import { WallCompact } from "@/components/wall/WallCompact";
import { parseHashTargets } from "@/lib/notif-navigate";

export function SocialWallPanel() {
  const [expanded, setExpanded] = useState(false);
  const { requireAuth } = useAuth();
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    const { primary } = parseHashTargets(hash);
    if (primary && primary.startsWith("post-")) setExpanded(true);
  }, [hash]);

  useEffect(() => {
    if (!expanded) return;
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
  }, [expanded]);

  const openPublish = () => {
    requireAuth(() => setExpanded(true));
  };

  if (!expanded) {
    return <WallCompact onExpand={() => setExpanded(true)} onPublish={openPublish} />;
  }

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Mur social"
    >
      <div className="mx-auto max-w-3xl px-3 pt-4 pb-32 sm:px-6">
        <SocialWall onCollapse={() => setExpanded(false)} />
      </div>
    </div>
  );
}