import { Volume2, VolumeX, Volume1, Volume } from "lucide-react";
import { useRadio } from "./RadioPlayerProvider";

/**
 * Mute toggle + volume slider.
 * - Fully keyboard-accessible (native <input type="range">: ←/→/↑/↓, Home/End, PageUp/PageDown).
 * - Visual states mirror the play button: same rounded-full shape, same
 *   shadow, same focus-visible ring, aria-pressed on the mute toggle.
 */
export function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = useRadio();

  const effective = muted ? 0 : volume;
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.34 ? Volume : volume < 0.67 ? Volume1 : Volume2;
  const pct = Math.round(effective * 100);

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

      <label className="inline-flex items-center gap-2">
        <span className="sr-only">Volume ({pct}%)</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => setVolume(Number(e.currentTarget.value) / 100)}
          aria-label="Volume"
          aria-valuetext={`${pct} pour cent`}
          className="volume-slider h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            backgroundImage: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-muted) ${pct}%)`,
          }}
        />
      </label>
    </div>
  );
}