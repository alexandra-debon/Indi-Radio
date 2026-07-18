import { useRadio } from "./RadioPlayerProvider";

/**
 * Simple "live" listening indicator: pulsing dot + text.
 * No progress bar, no gauge — meant for live streams where the duration is
 * unknown (and therefore must not display a progress bar on the OS or in
 * the app).
 */
export function LiveIndicator({ className = "" }: { className?: string }) {
  const { durationKnown } = useRadio();
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      aria-live="polite"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <span className="text-sm font-bold uppercase tracking-wide">
        {durationKnown ? "Lecture en cours" : "En direct"}
      </span>
    </span>
  );
}
