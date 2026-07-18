import { cn } from "@/lib/utils";

/**
 * Mini-visualiseur à barres indiquant qu'un flux audio est actif.
 * 4 barres animées indépendamment, sans dépendance au signal audio réel.
 */
export function AudioBars({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-end gap-[2px] h-3", className)}
      aria-hidden="true"
      title="Flux actif"
    >
      <span className="audio-bar w-[3px] rounded-full bg-primary h-full" />
      <span className="audio-bar w-[3px] rounded-full bg-primary h-full" />
      <span className="audio-bar w-[3px] rounded-full bg-primary h-full" />
      <span className="audio-bar w-[3px] rounded-full bg-primary h-full" />
    </span>
  );
}
