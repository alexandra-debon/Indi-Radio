import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { computeMentionInsertion } from "./insert-mention";
import { useAuth } from "@/hooks/use-auth";
import { Megaphone } from "lucide-react";

interface Suggestion {
  id: string;
  pseudo: string;
  role: string;
  group?: boolean;
  hint?: string;
}

interface Props extends React.ComponentProps<typeof Textarea> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

// Broad mention token: letters (unicode), digits, underscore, hyphen, dot
const TOKEN_RE = /(^|\s)@([\p{L}\p{N}_.-]*)$/u;

const GROUP_TAGS: Suggestion[] = [
  { id: "grp-allindi", pseudo: "AllIndi", role: "Toute la communauté", group: true, hint: "Notifie tous les utilisateurs" },
  { id: "grp-allartists", pseudo: "AllArtists", role: "Tous les artistes", group: true, hint: "Notifie les comptes artistes" },
  { id: "grp-allfans", pseudo: "AllFans", role: "Tous les auditeurs", group: true, hint: "Notifie les auditeurs" },
];

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onChange, className, ...rest },
  ref,
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLTextAreaElement);
  const { isAdmin } = useAuth();

  const [query, setQuery] = useState<string | null>(null);
  const [tokenStart, setTokenStart] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Detect current @token at caret
  const detect = () => {
    const el = localRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(TOKEN_RE);
    if (!m) {
      setQuery(null);
      setTokenStart(null);
      return;
    }
    const start = caret - m[2].length - 1; // position of '@'
    setTokenStart(start);
    setQuery(m[2]);
  };

  useEffect(() => {
    if (query === null) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const run = async () => {
      const q = query.trim();
      let req = supabase.from("profiles").select("id, pseudo, role").order("pseudo").limit(6);
      if (q.length > 0) req = req.ilike("pseudo", `${q}%`);
      const { data } = await req.abortSignal(controller.signal);
      if (!controller.signal.aborted) {
        const users = (data ?? []) as Suggestion[];
        const groups = isAdmin
          ? GROUP_TAGS.filter((g) => q.length === 0 || g.pseudo.toLowerCase().startsWith(q.toLowerCase()))
          : [];
        setSuggestions([...groups, ...users]);
        setActiveIdx(0);
      }
    };
    const t = setTimeout(run, 120);
    return () => { controller.abort(); clearTimeout(t); };
  }, [query, isAdmin]);

  const insert = (pseudo: string) => {
    const el = localRef.current;
    if (el === null || tokenStart === null) return;
    const caret = el.selectionStart ?? value.length;
    const { next, pos } = computeMentionInsertion(value, tokenStart, caret, pseudo);
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    nativeSetter?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    requestAnimationFrame(() => { el.setSelectionRange(pos, pos); el.focus(); });
    setQuery(null);
    setTokenStart(null);
  };

  const open = query !== null && suggestions.length > 0;

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={localRef}
        value={value}
        onChange={(e) => { onChange(e); requestAnimationFrame(detect); }}
        onKeyUp={detect}
        onClick={detect}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              insert(suggestions[activeIdx].pseudo);
              return;
            }
            if (e.key === "Escape") { setQuery(null); return; }
          }
          rest.onKeyDown?.(e);
        }}
        onBlur={(e) => { setTimeout(() => setQuery(null), 150); rest.onBlur?.(e); }}
        className={className}
      />
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded border-2 border-border bg-background shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); insert(s.pseudo); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === activeIdx ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {s.group && <Megaphone className="size-3.5" />}
                @{s.pseudo}
              </span>
              <span className={cn("ml-2 text-xs", i === activeIdx ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {s.group ? s.hint : s.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});