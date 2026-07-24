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
              prefillReply(e.currentTarget as HTMLElement, pseudo);
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

/**
 * Prefill the nearest reply composer with `@pseudo `.
 * Walks up the DOM from `origin` to find a `[data-reply-scope]` ancestor,
 * then targets a `[data-reply-composer] textarea` (or first textarea) inside it.
 * Uses the native value setter so React `onChange` fires correctly.
 */
function prefillReply(origin: HTMLElement, pseudo: string) {
  const scope = origin.closest("[data-reply-scope]") ?? document.body;
  const ta =
    scope.querySelector<HTMLTextAreaElement>("[data-reply-composer] textarea") ??
    scope.querySelector<HTMLTextAreaElement>("textarea");
  if (!ta) return;
  const mention = `@${pseudo} `;
  const current = ta.value ?? "";
  const stripped = current.replace(/^@[\p{L}\p{N}_.-]+\s+/u, "");
  const next = current.startsWith(mention) ? current : stripped ? `${mention}${stripped}` : mention;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(ta, next);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => {
    try {
      ta.focus();
      ta.setSelectionRange(next.length, next.length);
      ta.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {}
  });
}