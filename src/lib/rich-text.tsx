import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CornerUpLeft } from "lucide-react";
import { normalizeHashtag } from "@/lib/hashtag";

// Matches @mention or #hashtag (Unicode letters/numbers, `_` `.` `-`).
const TOKEN_RE = /([@#][\p{L}\p{N}_.-]+)/gu;

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_.-]+)/gu)) {
    const n = normalizeHashtag(m[1]);
    if (n) out.add(n);
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
      const raw = p.slice(1);
      const tag = normalizeHashtag(raw);
      if (!tag) return <span key={i}>{p}</span>;
      return (
        <Link
          key={i}
          to="/tag/$tag"
          params={{ tag }}
          className="font-semibold text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {`#${tag}`}
        </Link>
      );
    }
    if (p.startsWith("@") && p.length > 1) {
      const pseudo = p.slice(1);
      return (
        <span key={i} className="mention-wrap inline-flex items-baseline gap-0.5">
          <Link
            to="/u/$pseudo"
            params={{ pseudo }}
            className="mention font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {p}
          </Link>
          <button
            type="button"
            aria-label={`Répondre à @${pseudo}`}
            title={`Répondre à @${pseudo}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const evt = new CustomEvent("indi:mention-reply", {
                detail: { pseudo },
                bubbles: true,
              });
              e.currentTarget.dispatchEvent(evt);
            }}
            className="inline-flex size-4 translate-y-[1px] items-center justify-center rounded text-muted-foreground/70 hover:text-primary"
          >
            <CornerUpLeft className="size-3" aria-hidden />
          </button>
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}