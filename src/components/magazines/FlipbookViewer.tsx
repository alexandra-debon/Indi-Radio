import { useState } from "react";
import { Maximize2, ExternalLink, BookOpen, Volume2, Film } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { normalizeFlipHtml5Url, flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";
import { useLang } from "@/hooks/use-lang";

const TXT = {
  fr: {
    open: "Ouvrir le magazine",
    openAria: "Ouvrir le magazine interactif",
    newTab: "Ouvrir dans un nouvel onglet",
    hint: "Article interactif : audio, vidéo et animations à l'intérieur.",
    interactive: "Interactif",
  },
  en: {
    open: "Open the magazine",
    openAria: "Open the interactive magazine",
    newTab: "Open in a new tab",
    hint: "Interactive article: audio, video and animations inside.",
    interactive: "Interactive",
  },
} as const;

/**
 * Preview of a FlipHTML5 interactive magazine.
 * Mobile: large, full-width A4 card; tapping opens the flipbook full-screen.
 * Desktop: compact A4 miniature in a modal.
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
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const embedUrl = normalizeFlipHtml5Url(url);
  const thumb = coverUrl || flipHtml5ThumbnailUrl(url);

  return (
    <div className="my-3">
      <div
        className="mx-auto w-full max-w-[260px] overflow-hidden rounded-lg border border-border bg-black shadow-md sm:max-w-[220px]"
        style={{ aspectRatio: "1 / 1.414" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative block h-full w-full"
          aria-label={`${t.openAria} : ${title}`}
        >
          {thumb ? (
            <img
              src={thumb}
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
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-95" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-2 py-2.5 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">
              <BookOpen className="size-3.5" /> {t.open}
            </span>
            <span className="inline-flex items-center gap-2 text-[10px] opacity-80">
              <Volume2 className="size-3" />
              <Film className="size-3" />
            </span>
          </span>
          <span className="pointer-events-none absolute right-1.5 top-1.5 grid size-7 place-items-center rounded bg-black/60 text-white backdrop-blur sm:opacity-0 sm:transition sm:group-hover:opacity-100">
            <Maximize2 className="size-3.5" />
          </span>
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
            {t.interactive}
          </span>
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">{t.hint}</p>
      <div className="mt-1 text-center">
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <ExternalLink className="size-3" /> {t.newTab}
        </a>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black p-0 sm:left-1/2 sm:top-1/2 sm:h-[92vh] sm:w-[96vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-black/70 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <iframe
            src={embedUrl}
            title={title}
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
