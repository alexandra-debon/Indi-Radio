import { useEffect, type RefObject } from "react";

/**
 * Listens for the `indi:mention-reply` custom event bubbling up from a
 * "Reply to @pseudo" shortcut inside `scopeRef`. The nearest scope wins
 * (we stop propagation so outer composers don't also react).
 */
export function useReplyScope(
  scopeRef: RefObject<HTMLElement | null>,
  onReply: (pseudo: string) => void,
) {
  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    const h = (e: Event) => {
      const pseudo = (e as CustomEvent<{ pseudo?: string }>).detail?.pseudo;
      if (!pseudo) return;
      e.stopPropagation();
      onReply(pseudo);
    };
    el.addEventListener("indi:mention-reply", h as EventListener);
    return () => el.removeEventListener("indi:mention-reply", h as EventListener);
  }, [scopeRef, onReply]);
}

/**
 * Helper to prefill a textarea value with `@pseudo ` at the start.
 * Idempotent: if the text already starts with the mention, keeps it as-is.
 */
export function prefixMention(current: string, pseudo: string): string {
  const tag = `@${pseudo} `;
  if (current.startsWith(tag)) return current;
  // Strip a leading different-mention prefix so switching targets is clean.
  const stripped = current.replace(/^@[\p{L}\p{N}_.-]+\s+/u, "");
  return stripped ? `${tag}${stripped}` : tag;
}