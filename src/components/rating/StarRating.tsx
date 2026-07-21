import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null | undefined;
  onChange?: (v: number | null) => void;
  size?: number;
  className?: string;
  label?: string;
};

/**
 * Notation rédaction (0–5 étoiles). Cliquer sur l'étoile déjà sélectionnée retire la note.
 * En lecture seule quand onChange n'est pas fourni.
 */
export function StarRating({ value, onChange, size = 18, className, label }: Props) {
  const readOnly = !onChange;
  const current = value ?? 0;
  return (
    <div className={cn("inline-flex items-center gap-1", className)} aria-label={label ?? "Note rédaction"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= current;
        const Icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              filled ? "fill-primary text-primary" : "text-muted-foreground",
              "transition-transform",
            )}
          />
        );
        if (readOnly) return <span key={n}>{Icon}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange!(current === n ? null : n)}
            className="rounded-sm p-0.5 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          >
            {Icon}
          </button>
        );
      })}
      {readOnly && current > 0 && (
        <span className="ml-1 text-xs font-semibold text-muted-foreground tabular-nums">
          {current}/5
        </span>
      )}
    </div>
  );
}