import { useState } from "react";
import { Maximize2, ExternalLink, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { normalizeFlipHtml5Url } from "@/lib/fliphtml5";

/**
 * Miniature A4-ratio (1 : √2) preview of a FlipHTML5 flipbook.
 * Clicking the preview opens the flipbook full-screen inside a modal.
 */
export function FlipbookViewer({
  url,
  title,
  coverUrl,
}: {
  url: string;
  title: string;
  coverUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const embedUrl = normalizeFlipHtml5Url(url);

  return (
    <div className="my-2">
      <div
        className="mx-auto w-full max-w-[220px] overflow-hidden rounded-md border border-border bg-black shadow-md"
        style={{ aspectRatio: "1 / 1.414" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative block h-full w-full"
          aria-label={`Ouvrir le magazine : ${title}`}
          title="Cliquer pour ouvrir le magazine interactif"
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <iframe
              src={embedUrl}
              title={title}
              loading="lazy"
              scrolling="no"
              referrerPolicy="strict-origin-when-cross-origin"
              className="pointer-events-none h-full w-full border-0"
            />
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90 transition group-hover:opacity-100" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-semibold text-white">
            <BookOpen className="size-3.5" /> Ouvrir le magazine
          </span>
          <span className="pointer-events-none absolute right-1.5 top-1.5 grid size-7 place-items-center rounded bg-black/60 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Maximize2 className="size-3.5" />
          </span>
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
            A4
          </span>
        </button>
      </div>
      <div className="mt-1.5 text-center">
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" /> Ouvrir dans un nouvel onglet
        </a>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-none w-[96vw] h-[92vh] p-0 border-0 bg-black overflow-hidden sm:rounded-lg [&>button]:text-white [&>button]:bg-black/70 [&>button]:rounded-full [&>button]:p-2 [&>button]:opacity-100 [&>button]:top-3 [&>button]:right-3 [&>button]:z-20"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <iframe
            src={embedUrl}
            title={title}
            allow="fullscreen; autoplay; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}