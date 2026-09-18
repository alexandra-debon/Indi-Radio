import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { EmbedFrame } from "@/components/media/EmbedFrame";

const DEVICES = [
  { key: "mobile", label: "Mobile", width: 390, icon: Smartphone },
  { key: "desktop", label: "Desktop", width: 1280, icon: Monitor },
] as const;

/**
 * Aperçu d'une intégration rendu simultanément en largeur mobile (390px)
 * et desktop (1280px), mis à l'échelle pour tenir dans le panneau d'édition.
 * Permet de valider le rendu responsive avant publication.
 */
function DevicePane({
  url,
  height,
  title,
  width,
  label,
  Icon,
}: {
  url: string;
  height?: number | null;
  title: string;
  width: number;
  label: string;
  Icon: typeof Monitor;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth;
      if (available <= 0) return;
      const next = Math.min(1, available / width);
      // Les allers-retours d'arrondis de largeur font osciller l'échelle
      // d'un pixel : on n'étatise que les changements réellement visibles.
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    update();
    let queued = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(update);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(queued);
      ro.disconnect();
    };
  }, [width]);

  const frameHeight = height && height > 0 ? Math.min(Math.max(height, 200), 2000) : Math.round((width * 9) / 16);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          {label} · {width}px
        </span>
      </div>
      <div
        ref={hostRef}
        className="overflow-hidden rounded-md border-2 border-border bg-black/20 p-1"
        style={{ height: frameHeight * scale + 8 }}
      >
        <div
          style={{
            width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <EmbedFrame url={url} height={frameHeight} title={`${title} — ${label}`} />
        </div>
      </div>
    </div>
  );
}

export function ResponsiveEmbedPreview({
  url,
  height,
  title = "Aperçu du contenu intégré",
  className = "",
}: {
  url: string;
  height?: number | null;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {DEVICES.map((d) => (
        <DevicePane
          key={d.key}
          url={url}
          height={height}
          title={title}
          width={d.width}
          label={d.label}
          Icon={d.icon}
        />
      ))}
    </div>
  );
}
