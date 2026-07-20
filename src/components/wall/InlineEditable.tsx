import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Props = {
  initial: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
  maxLength?: number;
  save: (value: string) => Promise<void>;
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
}: Props) {
  const [value, setValue] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<number | null>(null);
  const last = useRef(initial ?? "");

  useEffect(() => {
    setValue(initial ?? "");
    last.current = initial ?? "";
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={2}
          className={cn(baseCls, "resize-none")}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={baseCls}
        />
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
    </div>
  );
}