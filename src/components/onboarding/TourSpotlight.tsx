import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Lang = "fr" | "en";

export type TourStep = {
  id: string;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  target: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type TourSpotlightProps = {
  open: boolean;
  steps: TourStep[];
  step: number;
  lang: Lang;
  dontShowAgain: boolean;
  onToggleDontShowAgain: (checked: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

const PADDING = 8;

export function TourSpotlight({
  open,
  steps,
  step,
  lang,
  dontShowAgain,
  onToggleDontShowAgain,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; placement: TourStep["placement"] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = steps[step];
  const total = steps.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  useEffect(() => {
    if (!open || !current) return;

    const update = () => {
      const el = document.querySelector(current.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        setTooltipPos(null);
        return;
      }

      const r = el.getBoundingClientRect();
      const padded = {
        left: r.left - PADDING,
        top: r.top - PADDING,
        right: r.right + PADDING,
        bottom: r.bottom + PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
      setRect(new DOMRect(padded.left, padded.top, padded.width, padded.height));

      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      const placement = computePlacement(r, current.placement);
      const pos = positionTooltip(r, placement);
      setTooltipPos(pos);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 500);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onNext, onPrev, onSkip]);

  const t = useT();
  const nextLabel = isLast ? t("tour.finish") : t("tour.next");
  const backLabel = t("tour.back");
  const skipLabel = t("tour.skip");
  const dontShowLabel = t("tour.dontShow");

  if (!open || !current) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-body"
    >
      {/* Dimmed overlay with a hole */}
      {rect ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-black/75" style={{ bottom: `calc(100% - ${rect.top}px)` }} />
          <div className="absolute bottom-0 bg-black/75" style={{ top: `${rect.bottom}px`, left: 0, right: 0 }} />
          <div
            className="absolute left-0 bg-black/75"
            style={{ top: `${rect.top}px`, bottom: `calc(100% - ${rect.bottom}px)`, width: `${rect.left}px` }}
          />
          <div
            className="absolute right-0 bg-black/75"
            style={{ top: `${rect.top}px`, bottom: `calc(100% - ${rect.bottom}px)`, width: `calc(100% - ${rect.right}px)` }}
          />
          {/* Highlight ring */}
          <div
            className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-black/50"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/75" />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          "absolute max-w-xs rounded-xl border-2 border-black bg-background p-4 shadow-[4px_4px_0_0_#000]",
          !tooltipPos && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={
          tooltipPos
            ? {
                left: tooltipPos.left,
                top: tooltipPos.top,
              }
            : {}
        }
      >
        <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>
            {t("tour.step")} {step + 1} / {total}
          </span>
          <span className="text-primary">{Math.round(((step + 1) / total) * 100)}%</span>
        </div>
        <h2 id="tour-step-title" className="mb-2 text-lg font-black text-foreground">
          {current.title[lang]}
        </h2>
        <p id="tour-step-body" className="mb-4 text-sm leading-relaxed text-foreground/80">
          {current.body[lang]}
        </p>

        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            id="tour-dont-show"
            checked={dontShowAgain}
            onCheckedChange={(c) => onToggleDontShowAgain(c === true)}
            aria-label={dontShowLabel}
          />
          <label htmlFor="tour-dont-show" className="cursor-pointer text-xs font-semibold text-foreground/80">
            {dontShowLabel}
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            {skipLabel}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={isFirst}>
              <ChevronLeft className="mr-1 size-4" />
              {backLabel}
            </Button>
            <Button size="sm" onClick={onNext}>
              {nextLabel}
              {!isLast && <ChevronRight className="ml-1 size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onSkip}
        aria-label={skipLabel}
        className="fixed right-3 top-3 z-[110] grid size-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

function computePlacement(
  target: DOMRect,
  preferred: TourStep["placement"] = "bottom",
): NonNullable<TourStep["placement"]> {
  const margin = 16;
  const tooltipWidth = 320;
  const tooltipHeight = 240;

  const fits = {
    top: target.top - tooltipHeight - margin >= 0,
    bottom: target.bottom + tooltipHeight + margin <= window.innerHeight,
    left: target.left - tooltipWidth - margin >= 0,
    right: target.right + tooltipWidth + margin <= window.innerWidth,
  };

  if (fits[preferred]) return preferred;
  if (fits.bottom) return "bottom";
  if (fits.top) return "top";
  if (fits.right) return "right";
  if (fits.left) return "left";
  return "bottom";
}

function positionTooltip(target: DOMRect, placement: NonNullable<TourStep["placement"]>) {
  const margin = 16;
  const tooltipWidth = 320;
  const tooltipHeight = 260;
  const maxLeft = Math.max(margin, window.innerWidth - tooltipWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - tooltipHeight - margin);
  const centerLeft = Math.min(
    Math.max(target.left + target.width / 2 - tooltipWidth / 2, margin),
    maxLeft,
  );

  let left: number;
  let top: number;
  switch (placement) {
    case "top":
      left = centerLeft;
      top = target.top - tooltipHeight - margin;
      break;
    case "bottom":
      left = centerLeft;
      top = target.bottom + margin;
      break;
    case "left":
      left = target.left - tooltipWidth - margin;
      top = target.top;
      break;
    case "right":
      left = target.right + margin;
      top = target.top;
      break;
  }
  // Clamp within viewport so the Next/Back buttons stay reachable even
  // when the target is huge (e.g. a full-height wall) or off-screen.
  left = Math.min(Math.max(left, margin), maxLeft);
  top = Math.min(Math.max(top, margin), maxTop);
  return { left, top, placement };
}
