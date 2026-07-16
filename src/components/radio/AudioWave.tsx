import { useEffect, useRef } from "react";
import { useRadio } from "./RadioPlayerProvider";

interface AudioWaveProps {
  bars?: number;
  className?: string;
}

/**
 * Live audio-level waveform driven by the RadioPlayerProvider analyser.
 * Falls back to a flat baseline when the analyser reads silence.
 */
export function AudioWave({ bars = 24, className }: AudioWaveProps) {
  const { subscribeLevel } = useRadio();
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  // Weight bars in a soft bell curve so the middle reacts more than the edges
  const weights = useRef<number[]>([]);
  if (weights.current.length !== bars) {
    weights.current = Array.from({ length: bars }, (_, i) => {
      const t = (i / (bars - 1)) * 2 - 1; // -1..1
      return 0.55 + (1 - t * t) * 0.75;    // 0.55..1.3
    });
  }

  useEffect(() => {
    const smoothed = new Array(bars).fill(0);
    const lastApplied = new Array(bars).fill(-1);
    return subscribeLevel((level) => {
      const boosted = Math.min(1, level * 3.2);
      for (let i = 0; i < bars; i++) {
        const target = Math.min(1, boosted * weights.current[i]);
        smoothed[i] = smoothed[i] * 0.55 + target * 0.45;
        // scaleY (0.12..1.0) is compositor-only — no layout, no paint.
        const s = 0.12 + smoothed[i] * 0.88;
        // Skip DOM writes when the change is below a visible threshold.
        if (Math.abs(s - lastApplied[i]) < 0.01) continue;
        lastApplied[i] = s;
        const el = barsRef.current[i];
        if (el) el.style.transform = `scaleY(${s})`;
      }
    });
  }, [subscribeLevel, bars]);

  return (
    <span
      aria-hidden
      className={`flex h-4 w-full items-center gap-[2px] ${className ?? ""}`}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="block h-full flex-1 rounded-sm bg-primary/80 will-change-transform"
          style={{ transform: "scaleY(0.12)", transformOrigin: "center" }}
        />
      ))}
    </span>
  );
}