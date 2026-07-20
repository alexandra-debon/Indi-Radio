import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

// Matches @mention or #hashtag (Unicode letters/numbers, `_` `.` `-`).
const TOKEN_RE = /([@#][\p{L}\p{N}_.-]+)/gu;

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_.-]+)/gu)) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

/**
 * Render a plain string with clickable #hashtags and highlighted @mentions.
 * Emojis pass through natively (Unicode text). Safe: no HTML injection.
 */
export function renderRich(text: string | null | undefined): ReactNode {
  if (!text) return null;
  const parts = text.split(TOKEN_RE);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("#") && p.length > 1) {
      const tag = p.slice(1);
      return (
        <Link
          key={i}
          to="/tag/$tag"
          params={{ tag: tag.toLowerCase() }}
          className="font-semibold text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {p}
        </Link>
      );
    }
    if (p.startsWith("@") && p.length > 1) {
      return (
        <span key={i} className="mention">
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}