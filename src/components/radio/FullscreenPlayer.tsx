import { Play, Pause, Radio, X, Maximize2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRadio } from "./RadioPlayerProvider";
import { LikeButton } from "./LikeButton";
import { LiveIndicator } from "./LiveIndicator";
import { VolumeControl } from "./VolumeControl";
import { useArtwork } from "@/hooks/use-artwork";
import { ShareButton } from "@/components/share/ShareButton";
import { useT } from "@/lib/i18n";

function formatElapsed(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FullscreenPlayerTrigger() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const label = "Plein écran";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-black bg-primary text-primary-foreground shadow-[2px_2px_0_0_oklch(0_0_0)] outline-none transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_oklch(0_0_0)] active:translate-y-0 active:shadow-none"
      >
        <Maximize2 className="size-4" aria-hidden />
      </button>
      {open && <FullscreenPlayer onClose={() => setOpen(false)} />}
    </>
  );
}

function FullscreenPlayer({ onClose }: { onClose: () => void }) {
  const { playing, toggle, currentTrack, elapsedSeconds } = useRadio();
  const t = useT();
  const { data: artwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [artwork]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const showImg = artwork && !imgError;
  const title = currentTrack?.title ?? t("live.defaultTitle");
  const artist = currentTrack?.artist ?? t("live.defaultArtist");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lecteur plein écran"
      className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
          <Radio className="size-4" />
          InDi RaDio
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid size-10 place-items-center rounded-full border-2 border-black bg-card hover:bg-muted"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 overflow-y-auto">
        <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-4 border-black bg-muted shadow-[8px_8px_0_0_oklch(0_0_0)]">
          {showImg ? (
            <img
              src={artwork}
              alt={`${artist} — ${title}`}
              className="size-full object-cover"
              loading="eager"
              decoding="async"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="grid size-full place-items-center">
              <Radio className="size-20 text-primary" />
            </div>
          )}
          {playing && (
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-red-600 bg-red-600/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-600 animate-pulse">
              <span className="size-1.5 rounded-full bg-red-600 animate-pulse" />
              ON AIR
            </div>
          )}
        </div>

        <div className="w-full max-w-sm text-center">
          <div className="truncate text-2xl font-black">{title}</div>
          <div className="mt-1 truncate text-base text-muted-foreground">{artist}</div>
          {playing && currentTrack && (
            <div className="mt-2 text-sm font-medium tabular-nums text-muted-foreground">
              {formatElapsed(elapsedSeconds)}
            </div>
          )}
          <div className="mt-3 flex h-4 justify-center">
            {playing && <LiveIndicator />}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentTrack && <LikeButton trackId={currentTrack.id} />}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="grid size-20 place-items-center rounded-full border-4 border-black bg-primary text-primary-foreground shadow-[6px_6px_0_0_oklch(0_0_0)] transition-transform active:scale-95"
          >
            {playing ? <Pause className="size-9" /> : <Play className="size-9 translate-x-0.5" />}
          </button>
          {currentTrack && (
            <ShareButton
              target={{
                url: "/",
                title: `${currentTrack.artist} — ${currentTrack.title}`,
                text: t("live.shareText").replace("{title}", currentTrack.title),
              }}
              label={t("live.shareTrack")}
              variant="icon"
            />
          )}
        </div>

        <div className="pt-2">
          <VolumeControl />
        </div>
      </div>
    </div>
  );
}
