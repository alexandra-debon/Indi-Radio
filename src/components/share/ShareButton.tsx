import { useEffect, useState } from "react";
import {
  Share2,
  Copy,
  Mail,
  Link as LinkIcon,
  Facebook,
  Linkedin,
  MessageCircle,
  Send,
  Twitter,
  Smartphone,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { shareNative, isNative } from "@/lib/native";
import { useT, useLang } from "@/lib/i18n";
import { trackEvent } from "@/lib/plausible";
import { withHl } from "@/lib/og-lang";
import { SITE_ORIGIN } from "@/lib/canonical";

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

/**
 * Facebook ne peut lire que le site public : un lien depuis l'aperçu, l'app
 * iPhone/Android (capacitor://) ou un autre domaine interne ne donnerait
 * aucune image ni aucun titre. On réécrit donc toujours vers le domaine public.
 */
function resolveUrl(url?: string): string {
  const raw = url ?? (typeof window !== "undefined" ? window.location.href : "/");
  try {
    const base = typeof window !== "undefined" ? window.location.origin : SITE_ORIGIN;
    const u = new URL(raw, /^[a-z]+:\/\//i.test(base) ? base : SITE_ORIGIN);
    const local = typeof window !== "undefined" ? window.location.host : "";
    const isInternal =
      u.host === local ||
      /(^|\.)lovable\.app$|(^|\.)lovableproject\.com$|^localhost(:\d+)?$/i.test(u.host) ||
      !/^https?:$/.test(u.protocol);
    if (!isInternal) return u.toString();
    const pub = new URL(SITE_ORIGIN);
    return `${pub.origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return raw;
  }
}

/**
 * Bouton de partage universel : même menu partout (site, app iPhone/Android).
 * Sur téléphone, « Facebook » passe par la feuille de partage du système avec
 * le lien seul — l'app Facebook ignore sinon le lien de partage web.
 */
export function ShareButton({
  target,
  className = "",
  label,
  variant = "icon",
  contentType,
}: {
  target: ShareTarget;
  className?: string;
  label?: string;
  variant?: "icon" | "chip";
  /** Type de contenu partagé (playlist, post, episode…) pour les statistiques. */
  contentType?: string;
}) {
  const [open, setOpen] = useState(false);
  // Téléphone (app des stores ou navigateur mobile) : Facebook, X, etc.
  // interceptent leurs liens de partage web, ouvrent leur application et
  // oublient le lien. On passe alors par la feuille de partage du téléphone.
  const [mobile, setMobile] = useState(false);
  const [canSheet, setCanSheet] = useState(false);
  const t = useT();
  const { lang } = useLang();
  const en = lang === "en";
  // Libellé traduit par défaut, surchargeable par la prop `label`.
  const shareLabel = label ?? (en ? "Share" : "Partager");
  const otherAppsLabel = en ? "Other apps…" : "Autres apps…";
  const pasteHint = en
    ? "Link copied — paste it into your Facebook post."
    : "Lien copié — colle-le dans ta publication Facebook.";
  useEffect(() => {
    const native = isNative();
    const hasShare = typeof navigator !== "undefined" && "share" in navigator;
    const coarse =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const phoneUa = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
    setMobile(native || (coarse && phoneUa));
    setCanSheet(native || hasShare);
  }, []);
  // L'URL partagée porte la langue active (?hl=en) pour que Facebook,
  // LinkedIn ou Substack récupèrent l'aperçu dans la bonne langue.
  const url = withHl(resolveUrl(target.url), en ? "en" : "fr");
  const title = target.title ?? (typeof document !== "undefined" ? document.title : "Indi Radio");
  const text = target.text ?? title;

  const trackShare = (network: string) =>
    trackEvent("share", { network, type: contentType ?? "page", url });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      trackShare("copy_link");
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyError"));
    }
  }

  function openExternal(href: string) {
    const w = window.open(href, "_blank");
    if (w) w.opener = null;
    else window.location.href = href;
  }

  /** Feuille de partage du téléphone avec le lien SEUL (aperçu Facebook garanti). */
  async function shareLinkOnly(network: string): Promise<boolean> {
    if (!canSheet) return false;
    try {
      await shareNative({ url });
      trackShare(`${network}_sheet`);
      return true;
    } catch {
      return false;
    }
  }

  async function shareFacebook() {
    if (!mobile) {
      // Ordinateur : la fenêtre de partage Facebook lit l'aperçu de la page.
      trackShare("facebook");
      // Pas de « noopener » ici : il ferait renvoyer null à window.open.
      const w = window.open(links.facebook, "fb-share", "width=626,height=560");
      if (w) w.opener = null;
      else window.location.href = links.facebook;
      return;
    }
    if (await shareLinkOnly("facebook")) return;
    // Secours (téléphone sans feuille de partage) : copier puis ouvrir Facebook.
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* noop */
    }
    trackShare("facebook_paste");
    toast.success(pasteHint);
    openExternal("https://www.facebook.com/");
  }

  async function shareOtherApps() {
    try {
      await shareNative({ title, text, url });
      trackShare("native");
    } catch {
      await copy();
    }
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
          aria-label={shareLabel}
          title={shareLabel}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`${triggerClass} ${className}`}
        >
          <Share2 className="size-3.5" />
          {variant === "chip" && <span>{shareLabel}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onSelect={(e) => {
            // Appel direct dans le geste de l'utilisateur (exigé par iOS
            // pour ouvrir la feuille de partage), puis fermeture du menu.
            e.preventDefault();
            void shareFacebook();
            setOpen(false);
          }}
        >
          <Facebook className="size-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            trackShare("twitter");
            openExternal(links.twitter);
            setOpen(false);
          }}
        >
          <Twitter className="size-4" /> X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            trackShare("linkedin");
            openExternal(links.linkedin);
            setOpen(false);
          }}
        >
          <Linkedin className="size-4" /> LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            trackShare("whatsapp");
            openExternal(links.whatsapp);
            setOpen(false);
          }}
        >
          <MessageCircle className="size-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            trackShare("telegram");
            openExternal(links.telegram);
            setOpen(false);
          }}
        >
          <Send className="size-4" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            trackShare("reddit");
            openExternal(links.reddit);
            setOpen(false);
          }}
        >
          <LinkIcon className="size-4" /> Reddit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.email} onClick={() => trackShare("email")}>
            <Mail className="size-4" /> Email
          </a>
        </DropdownMenuItem>
        {mobile && canSheet && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void shareOtherApps();
              setOpen(false);
            }}
          >
            <Smartphone className="size-4" /> {otherAppsLabel}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            copy();
          }}
        >
          <Copy className="size-4" /> {t("share.copy")}
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
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
    email: `mailto:?subject=${t}&body=${body}`,
  };
}
