import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export interface NotifTarget {
  to: string;
  hash?: string;
}

/** Parse a notification.url like "/#post-abc" or "/actus#news-xyz" into router-safe pieces. */
export function parseNotifUrl(url: string | null | undefined): NotifTarget | null {
  if (!url) return null;
  const [pathRaw, hashRaw] = url.split("#");
  const path = pathRaw || "/";
  return { to: path === "" ? "/" : path, hash: hashRaw || undefined };
}

/** Parse a hash of shape `post-<id>` or `post-<id>|c-<commentId>` into its parts. */
export function parseHashTargets(hash: string | null | undefined): {
  primary: string | null;
  commentId: string | null;
} {
  if (!hash) return { primary: null, commentId: null };
  const clean = hash.replace(/^#/, "");
  const [primary, ...rest] = clean.split("|");
  const commentPart = rest.find((p) => p.startsWith("c-"));
  return {
    primary: primary || null,
    commentId: commentPart ? commentPart.slice(2) : null,
  };
}

function flash(el: HTMLElement) {
  el.classList.add("ring-4", "ring-primary", "ring-offset-2", "transition");
  setTimeout(() => {
    el.classList.remove("ring-4", "ring-primary", "ring-offset-2");
  }, 2200);
}

/** Scroll to `#hash` on mount / hash change and flash a ring highlight on the target.
 *  Supports composite hashes like `post-<id>|c-<commentId>`: scrolls to the comment
 *  when it appears in the DOM, otherwise falls back to the primary anchor. */
export function useHashHighlight() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (!hash) return;
    const { primary, commentId } = parseHashTargets(hash);
    if (!primary && !commentId) return;
    let cancelled = false;
    // Scroll to the primary anchor first for context, then upgrade to comment when it mounts.
    let scrolledPrimary = false;
    const tryScroll = (attempt = 0) => {
      if (cancelled) return;
      const commentEl = commentId ? document.getElementById(`comment-${commentId}`) : null;
      if (commentEl) {
        commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(commentEl);
        return;
      }
      if (!scrolledPrimary && primary) {
        const primaryEl = document.getElementById(primary);
        if (primaryEl) {
          primaryEl.scrollIntoView({ behavior: "smooth", block: "center" });
          if (!commentId) flash(primaryEl);
          scrolledPrimary = true;
          if (!commentId) return;
        }
      }
      if (attempt < 40) setTimeout(() => tryScroll(attempt + 1), 150);
    };
    tryScroll();
    return () => { cancelled = true; };
  }, [hash]);
}