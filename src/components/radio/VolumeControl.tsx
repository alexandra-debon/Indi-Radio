import { Volume2, VolumeX } from "lucide-react";
import { useRadio } from "./RadioPlayerProvider";

/**
 * Mute toggle + volume slider.
 * - Fully keyboard-accessible (native <input type="range">: ←/→/↑/↓, Home/End, PageUp/PageDown).
 * - Visual states mirror the play button: same rounded-full shape, same
 *   shadow, same focus-visible ring, aria-pressed on the mute toggle.
 */
export function VolumeControl() {
  const { muted, toggleMute, volume, setVolume } = useRadio();
  const Icon = muted || volume === 0 ? VolumeX : Volume2;
  const percent = Math.round((muted ? 0 : volume) * 100);

  return (
    <div
      role="group"
      aria-label="Volume Indi Radio"
      className="inline-flex items-center gap-2"
    >
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Réactiver le son" : "Couper le son"}
        aria-pressed={muted}
        data-state={muted ? "muted" : "on"}
        className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-[2px_2px_0_0_oklch(0_0_0)] outline-none transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=muted]:bg-muted data-[state=muted]:text-muted-foreground"
      >
        <Icon className="size-4" aria-hidden />
      </button>
      {/*
        Custom "growing bar" slider:
        - The visible bar is a black-bordered track whose yellow fill widens
          with the volume (from a thin sliver at 0% to full width at 100%).
        - A transparent native <input type="range"> sits on top to keep
          full keyboard + touch + pointer accessibility on desktop, mobile
          and iOS/Android Capacitor WebViews.
      */}
      <div className="relative h-6 w-32 select-none">
        <div
          aria-hidden
          className="absolute inset-y-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow-[2px_2px_0_0_oklch(0_0_0)]"
        />
        <div
          aria-hidden
          className="absolute inset-y-1/2 left-0 h-2 -translate-y-1/2 rounded-full border-2 border-foreground bg-primary transition-[width] duration-75"
          style={{ width: `${Math.max(6, percent)}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Réglage du volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}%`}
          className="absolute inset-0 h-full w-full cursor-pointer touch-none opacity-0"
        />
      </div>
    </div>
  );
}