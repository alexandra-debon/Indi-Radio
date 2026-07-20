import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { EmojiPickerButton } from "@/components/text/EmojiPickerButton";
import { renderRich } from "@/lib/rich-text";

type Props = {
  initial: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
  maxLength?: number;
  save: (value: string) => Promise<void>;
  withEmoji?: boolean;
  preview?: boolean;
};

/**
 * Inline-editable text field with debounced autosave.
 * Shows a small status hint (saving / saved / error).
 */
export function InlineEditable({
  initial,
  placeholder,
  multiline,
  className,
  ariaLabel,
  maxLength,
  save,
  withEmoji,
  preview,
}: Props) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<number | null>(null);
  const last = useRef(initial ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);

  const insertAtCursor = (snippet: string) => {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v + snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    if (maxLength && next.length > maxLength) return;
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
    });
  };

  useEffect(() => {
    const next = initial ?? "";
    // Don't clobber the user's in-progress edit if the incoming value
    // matches what we last successfully saved (typical after a refetch).
    if (next === last.current) return;
    setValue(next);
    last.current = next;
  }, [initial]);

  useEffect(() => {
    if (value === last.current) return;
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        await save(value);
        last.current = value;
        setStatus("saved");
        window.setTimeout(() => {
          setStatus((s) => (s === "saved" ? "idle" : s));
        }, 1200);
      } catch (e) {
        setStatus("error");
        toast.error((e as Error).message || "Enregistrement impossible");
      }
    }, 700);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const baseCls = cn(
    "w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 outline-none",
    "hover:border-border focus:border-primary focus:bg-background",
    className,
  );

  return (
    <div className="relative group">
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          ref={(el) => { inputRef.current = el; }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={2}
          className={cn(baseCls, "resize-none", withEmoji && "pr-8")}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          ref={(el) => { inputRef.current = el; }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(baseCls, withEmoji && "pr-8")}
        />
      )}
      {withEmoji && (
        <div className="absolute right-6 top-0.5">
          <EmojiPickerButton onPick={(e) => insertAtCursor(e)} />
        </div>
      )}
      <span
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute right-1.5 top-0.5 text-[9px] font-bold uppercase tracking-wide",
          status === "saving" && "text-muted-foreground",
          status === "saved" && "text-primary",
          status === "error" && "text-destructive",
          status === "idle" && "opacity-0",
        )}
      >
        {status === "saving" && "…"}
        {status === "saved" && "✓"}
        {status === "error" && "!"}
      </span>
      {preview && focused && value.trim() && (
        <div className="mt-1 rounded border border-dashed border-border bg-muted/30 px-1.5 py-1 text-[11px] leading-snug">
          <span className="mr-1 text-[9px] font-bold uppercase text-muted-foreground">Aperçu</span>
          <span className="whitespace-pre-wrap">{renderRich(value)}</span>
        </div>
      )}
    </div>
  );
}