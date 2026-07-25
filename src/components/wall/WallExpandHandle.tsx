import { ChevronDown, ChevronUp } from "lucide-react";

interface WallExpandHandleProps {
  direction: "up" | "down";
  onClick: () => void;
  label?: string;
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}

export function WallExpandHandle({
  direction,
  onClick,
  label,
  className = "",
  showLabel = true,
  disabled = false,
}: WallExpandHandleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group inline-flex items-center justify-center gap-1.5
        rounded-full bg-primary text-primary-foreground
        border-2 border-black shadow-[2px_2px_0_0_#000]
        px-3 py-1.5 text-xs font-bold uppercase tracking-wide
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] hover:bg-primary/90
        active:translate-y-0 active:shadow-[1px_1px_0_0_#000]
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
        disabled:hover:shadow-[2px_2px_0_0_#000]
        ${className}
      `}
      aria-label={label}
      title={label}
      aria-disabled={disabled}
      data-testid={direction === "down" ? "wall-expand-handle" : "wall-collapse-handle"}
    >

      {direction === "down" && (
        <ChevronDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5 animate-bounce-slow" />
      )}
      {direction === "up" && (
        <ChevronUp className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 animate-bounce-slow" />
      )}
      {showLabel && label && <span>{label}</span>}
    </button>
  );
}
