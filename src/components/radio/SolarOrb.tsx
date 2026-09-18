import { useEffect, useRef } from "react";
import { useRadio } from "./RadioPlayerProvider";
import { cn } from "@/lib/utils";

/**
 * Anneau solaire réactif au niveau audio réel du flux.
 * Rendu en <canvas> : couronne jaune + « éruptions solaires » (langues de
 * plasma) dont la longueur suit le niveau. Repli sur une respiration douce
 * quand l'analyser ne renvoie rien (iOS, lecture arrêtée).
 * La couleur est lue depuis la couleur calculée de l'élément (token --primary),
 * jamais codée en dur.
 */
export function SolarOrb({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { subscribeLevel, playing } = useRadio();
  const levelRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => subscribeLevel((l) => { levelRef.current = l; }), [subscribeLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color = getComputedStyle(canvas).color || "gold";
    const FLARES = 48;
    const seeds = Array.from({ length: FLARES }, () => Math.random() * 1000);
    let raf = 0;
    let smooth = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      // Réécrire les mêmes dimensions relancerait l'observateur : on ne
      // touche au canevas que si la taille a réellement changé.
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let queued = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(resize);
    });
    ro.observe(canvas);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.016;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.32;

      const raw = playingRef.current ? levelRef.current : 0;
      const idle = 0.12 + Math.sin(t * 1.4) * 0.04;
      const target = Math.max(raw, playingRef.current ? idle : idle * 0.5);
      smooth += (target - smooth) * 0.18;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // Halo
      const halo = ctx.createRadialGradient(cx, cy, base * 0.8, cx, cy, base * (1.5 + smooth));
      halo.addColorStop(0, color);
      halo.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.14 + smooth * 0.25;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, base * (1.6 + smooth), 0, Math.PI * 2);
      ctx.fill();

      // Éruptions
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      for (let i = 0; i < FLARES; i++) {
        const a = (i / FLARES) * Math.PI * 2;
        const noise =
          Math.sin(t * 2.2 + seeds[i]) * 0.5 + Math.sin(t * 5.3 + seeds[i] * 1.7) * 0.5;
        const len = base * (0.12 + smooth * (0.7 + noise * 0.55));
        const r0 = base * 1.02;
        const r1 = r0 + Math.max(2, len);
        ctx.globalAlpha = 0.25 + smooth * 0.6;
        ctx.lineWidth = 1.5 + smooth * 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // Couronne
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2 + smooth * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, base * (1 + smooth * 0.05), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(queued);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full text-primary", className)}
    />
  );
}
