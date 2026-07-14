import { Play, Pause, Radio } from "lucide-react";
import { useRadio } from "./RadioPlayerProvider";
import { LikeButton } from "./LikeButton";

export function MiniPlayer() {
  const { playing, toggle, currentTrack } = useRadio();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-[1px]" />}
        </button>
        <div className="grid size-12 shrink-0 place-items-center rounded-sm bg-muted">
          <Radio className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {currentTrack?.title ?? "En direct"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {currentTrack?.artist ?? "Indi Radio · live"}
          </div>
        </div>
        {currentTrack && <LikeButton trackId={currentTrack.id} />}
      </div>
    </div>
  );
}