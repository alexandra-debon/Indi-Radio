import { Play, Pause, Radio } from "lucide-react";
import { useState, useEffect } from "react";
import { useRadio } from "./RadioPlayerProvider";
import { LikeButton } from "./LikeButton";
import { LiveIndicator } from "./LiveIndicator";
import { useArtwork } from "@/hooks/use-artwork";
import { AdminChatTrigger } from "@/components/chat/AdminChatTrigger";
import { ShareButton } from "@/components/share/ShareButton";
import { useT } from "@/lib/i18n";

function formatElapsed(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { playing, toggle, currentTrack, elapsedSeconds } = useRadio();
  const t = useT();
  const { data: artwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [artwork]);
  const showImg = artwork && !imgError;
  const initials =
    (currentTrack?.artist ?? "IR")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "IR";

  return (
    <div className="border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-[1px]" />}
        </button>
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-muted">
          {showImg ? (
            <img
              src={artwork}
              alt={currentTrack ? `${currentTrack.artist} — ${currentTrack.title}` : ""}
              className="size-full object-cover"
              loading="eager"
              decoding="async"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : currentTrack ? (
            <span className="text-xs font-black tracking-tight text-primary">{initials}</span>
          ) : (
            <Radio className="size-5 text-primary" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {playing && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-red-600 bg-red-600/10 px-1 py-[1px] text-[9px] font-black uppercase tracking-wider text-red-600 animate-pulse">
                  <span className="size-1.5 rounded-full bg-red-600 animate-pulse" />
                  ON AIR
                </span>
              )}
              <div className="truncate text-sm font-semibold">{currentTrack?.title ?? "En direct"}</div>
              {playing && currentTrack && (
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {formatElapsed(elapsedSeconds)}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {currentTrack?.artist ?? "Indi Radio · live"}
            </div>
            <div className="mt-1.5 h-3">
              {playing && <LiveIndicator />}
            </div>
          </div>
          {currentTrack && <LikeButton trackId={currentTrack.id} />}
        </div>
        <AdminChatTrigger />
      </div>
    </div>
  );
}
