import { Suspense, lazy, useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Load the picker only on demand (client-side); avoids SSR overhead.
const EmojiPicker = lazy(() => import("emoji-picker-react"));

type Props = {
  onPick: (emoji: string) => void;
  ariaLabel?: string;
  className?: string;
};

/**
 * Small emoji picker trigger — opens a popover with a full picker on click.
 */
export function EmojiPickerButton({ onPick, ariaLabel = "Insérer un emoji", className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          title={ariaLabel}
          className={
            "inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground " +
            (className ?? "")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <Smile className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0 border-2 border-black">
        <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Chargement…</div>}>
          <EmojiPicker
            onEmojiClick={(d: { emoji: string }) => {
              onPick(d.emoji);
              setOpen(false);
            }}
            width={320}
            height={380}
            lazyLoadEmojis
            searchPlaceHolder="Rechercher…"
            previewConfig={{ showPreview: false }}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}