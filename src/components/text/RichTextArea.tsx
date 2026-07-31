import { useRef } from "react";
import { Bold, Italic, Underline, Type } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { renderRich } from "@/lib/rich-text";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  ariaLabel?: string;
  preview?: boolean;
};

type Fmt = { label: string; title: string; open: string; close: string; icon?: React.ReactNode; cls?: string };

const FORMATS: Fmt[] = [
  { label: "B", title: "Gras", open: "**", close: "**", icon: <Bold className="size-3.5" /> },
  { label: "I", title: "Italique", open: "*", close: "*", icon: <Italic className="size-3.5" /> },
  { label: "U", title: "Souligné", open: "__", close: "__", icon: <Underline className="size-3.5" /> },
  { label: "A-", title: "Petite police", open: "[small]", close: "[/small]", cls: "text-[10px]" },
  { label: "A", title: "Police normale", open: "", close: "", cls: "text-xs" },
  { label: "A+", title: "Grande police", open: "[big]", close: "[/big]", cls: "text-sm" },
];

/**
 * Textarea with a small formatting toolbar (bold / italic / underline / 3 sizes).
 * Produces the lightweight markup understood by `renderRich`.
 */
export function RichTextArea({ value, onChange, placeholder, rows = 6, className, ariaLabel, preview = true }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const wrap = (f: Fmt) => {
    const el = ref.current;
    if (!f.open && !f.close) {
      // "A" = remove size markers from the selection
      if (!el) return;
      const s = el.selectionStart ?? 0;
      const e = el.selectionEnd ?? 0;
      const sel = value.slice(s, e).replace(/\[\/?(big|small)\]/g, "");
      onChange(value.slice(0, s) + sel + value.slice(e));
      return;
    }
    if (!el) {
      onChange(value + f.open + f.close);
      return;
    }
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + f.open + sel + f.close + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + f.open.length + sel.length;
      try { el.setSelectionRange(sel ? pos : pos, sel ? pos : pos); } catch { /* noop */ }
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="sticky top-0 z-10 -mx-1 flex flex-nowrap gap-1 overflow-x-auto rounded-md bg-background/95 px-1 py-1 backdrop-blur-sm scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible">
        {FORMATS.map((f) => (
          <button
            key={f.title}
            type="button"
            title={f.title}
            aria-label={f.title}
            onClick={() => wrap(f)}
            className={cn(
              "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded border border-border px-2 font-bold text-foreground hover:bg-muted sm:h-7 sm:min-w-7",
              f.cls ?? "text-sm sm:text-xs",
            )}
          >
            {f.icon ?? f.label}
          </button>
        ))}
      </div>
      <Textarea
        ref={ref}
        aria-label={ariaLabel}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      {preview && value.trim() && (
        <div className="rounded border border-dashed border-border bg-muted/30 p-2 text-sm leading-relaxed">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Aperçu</div>
          <div className="whitespace-pre-wrap">{renderRich(value)}</div>
        </div>
      )}
    </div>
  );
}
