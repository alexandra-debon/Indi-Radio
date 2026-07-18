import { Play, Pause, Radio } from "lucide-react";
import { useState, useEffect } from "react";
import { useRadio } from "./RadioPlayerProvider";
import { LikeButton } from "./LikeButton";
import { AudioWave } from "./AudioWave";
import { useArtwork } from "@/hooks/use-artwork";

export function MiniPlayer() {
  const { playing, toggle, currentTrack } = useRadio();
  const { data: artwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [artwork]);
  const showImg = artwork && !imgError;
  const initials = (currentTrack?.artist ?? "IR")
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "IR";

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {currentTrack?.title ?? "En direct"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {currentTrack?.artist ?? "Indi Radio · live"}
          </div>
          {playing && <AudioWave className="mt-1.5" bars={28} />}
        </div>
        {currentTrack && <LikeButton trackId={currentTrack.id} />}
      </div>
    </div>
  );
}