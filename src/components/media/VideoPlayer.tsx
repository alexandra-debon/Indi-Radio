import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MediaEmbed } from "@/lib/media-embed";

function providerLabel(m: MediaEmbed): string {
  if (m.kind === "youtube") return m.type === "playlist" ? "Playlist YouTube" : "Vidéo YouTube";
  return "Vidéo Vimeo";
}

export function VideoPlayer({ embed }: { embed: MediaEmbed }) {
  const [open, setOpen] = useState(false);
  const label = providerLabel(embed);

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border bg-black">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={embed.embedUrl}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
          aria-label="Agrandir la vidéo"
          title="Agrandir"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-none w-[96vw] h-[92vh] p-0 border-0 bg-black overflow-hidden sm:rounded-lg"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
          <iframe
            src={embed.embedUrl + (embed.embedUrl.includes("?") ? "&" : "?") + "autoplay=1"}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}