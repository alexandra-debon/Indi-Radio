import { Volume2, VolumeX } from "lucide-react";
import { useRadio } from "./RadioPlayerProvider";

/**
 * Mute toggle + volume slider.
 * - Strict jaune/noir InDi RaDio : track noir bordé, fill jaune, curseur jaune
 *   avec contour noir, focus/hover/active jaune sur le curseur et le groupe.
 * - Accessible clavier natif (←/→/↑/↓, Home/End, PageUp/PageDown).
 */
export function VolumeControl() {
  const { muted, toggleMute, volume, setVolume } = useRadio();
  const Icon = muted || volume === 0 ? VolumeX : Volume2;
  const percent = Math.round((muted ? 0 : volume) * 100);

  return (
    <div
      role="group"
      aria-label="Volume Indi Radio"
      className="group inline-flex items-center gap-2"
    >
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Réactiver le son" : "Couper le son"}
        aria-pressed={muted}
        data-state={muted ? "muted" : "on"}
        className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-[2px_2px_0_0_oklch(0_0_0)] outline-none transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_oklch(0_0_0)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=muted]:bg-muted data-[state=muted]:text-muted-foreground"
      >
        <Icon className="size-4" aria-hidden />
      </button>

      {/*
        Jauge "barre grandissante" :
        - Piste noire bordée de noir.
        - Remplissage jaune dont la largeur croît avec le volume.
        - Curseur natif jaune/noir visible, avec hover/focus/active jaune.
        - L'input range natif reste au-dessus pour le touch, la souris et
          le clavier sur desktop, mobile et WebViews Capacitor iOS/Android.
      */}
      <div className="relative h-6 w-32 select-none">
        <div
          aria-hidden
          className="absolute inset-y-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow-[2px_2px_0_0_oklch(0_0_0)]"
        />
        <div
          aria-hidden
          className="absolute inset-y-1/2 left-0 h-2 -translate-y-1/2 rounded-full border-2 border-foreground bg-primary transition-[width] duration-75 ease-out"
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
          className="volume-slider absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none"
        />
      </div>
    </div>
  );
}