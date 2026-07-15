import { useState } from "react";
import { Share2, Copy, Mail, Link as LinkIcon, Facebook, Linkedin, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { shareNative, isNative } from "@/lib/native";

export type ShareTarget = {
  /**
   * Chemin relatif (avec éventuel hash) OU URL absolue.
   * Ex: "/actus#news-abc", "/chroniques/mon-slug", "https://...".
   * Si non fourni : window.location.href.
   */
  url?: string;
  title?: string;
  text?: string;
};

function resolveUrl(url?: string): string {
  if (typeof window === "undefined") return url ?? "";
  if (!url) return window.location.href;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

/**
 * Bouton de partage universel. Sur mobile natif ou navigateurs supportant
 * navigator.share, ouvre la feuille système. Sinon, affiche un menu avec
 * Facebook, LinkedIn, WhatsApp, Telegram, Reddit, Email et « Copier le lien ».
 * (Pas de X / Twitter, à la demande du produit.)
 */
export function ShareButton({
  target,
  className = "",
  label = "Partager",
  variant = "icon",
}: {
  target: ShareTarget;
  className?: string;
  label?: string;
  variant?: "icon" | "chip";
}) {
  const [open, setOpen] = useState(false);
  const url = resolveUrl(target.url);
  const title = target.title ?? (typeof document !== "undefined" ? document.title : "Indi Radio");
  const text = target.text ?? title;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  async function handleTrigger(e: React.MouseEvent) {
    // Native sheet (Capacitor iOS/Android)
    if (isNative()) {
      e.preventDefault();
      try {
        await shareNative({ title, text, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    // Web Share API (mobile Safari/Chrome, PWA)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      e.preventDefault();
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, text, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    // Sinon : ouvrir le menu desktop
    setOpen(true);
  }

  const links = buildShareLinks({ url, title, text });

  const triggerClass =
    variant === "chip"
      ? "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
      : "inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={handleTrigger}
          aria-label={label}
          title={label}
          className={`${triggerClass} ${className}`}
        >
          <Share2 className="size-3.5" />
          {variant === "chip" && <span>Partager</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <a href={links.facebook} target="_blank" rel="noopener noreferrer">
            <Facebook className="size-4" /> Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
            <Linkedin className="size-4" /> LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.telegram} target="_blank" rel="noopener noreferrer">
            <Send className="size-4" /> Telegram
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.reddit} target="_blank" rel="noopener noreferrer">
            <LinkIcon className="size-4" /> Reddit
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.email}>
            <Mail className="size-4" /> Email
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); copy(); }}>
          <Copy className="size-4" /> Copier le lien
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildShareLinks({ url, title, text }: { url: string; title: string; text: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const body = encodeURIComponent(`${text}\n\n${url}`);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
    email: `mailto:?subject=${t}&body=${body}`,
  };
}