import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { withHl, type OgLang } from "@/lib/og-lang";
import { ogImageForLang, ogImageAlt, OG_ASSET_VERSION } from "@/lib/og-image";

const SITE = "https://www.radio.indi-art-culture.com";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Outil de contrôle admin : génère l'URL de partage EXACTE (même logique que
 * le bouton de partage public, via `withHl`) et affiche l'aperçu attendu
 * (titre, description, image, locale) pour valider rapidement le rendu
 * Facebook / LinkedIn / WhatsApp.
 */
export function SeoShareRow({
  path,
  lang,
  title,
  description,
}: {
  path: string;
  lang: OgLang;
  title: string;
  description: string;
}) {
  const isPrefix = path.endsWith("…");
  const [slug, setSlug] = useState("");
  const basePath = isPrefix ? path.slice(0, -1) + (slug.trim() || "exemple-slug") : path;
  const shareUrl = withHl(`${SITE}${basePath}`, lang);
  const img = ogImageForLang(lang);
  const [copied, setCopied] = useState(false);

  const fbDebug = `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shareUrl)}`;
  const liDebug = `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(shareUrl)}`;

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed bg-muted/30 p-3">
      {isPrefix && (
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug réel (ex. mon-article)"
          className="h-8 text-xs"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="default"
          className="h-8"
          onClick={async () => {
            const ok = await copy(shareUrl);
            setCopied(ok);
            toast[ok ? "success" : "error"](
              ok ? "URL de partage copiée" : "Copie impossible — sélectionnez l'URL",
            );
            if (ok) setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Share2 className="mr-1 h-3.5 w-3.5" />}
          Partager ({lang.toUpperCase()})
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={async () => {
            const payload = [
              `URL      : ${shareUrl}`,
              `og:title : ${title}`,
              `og:desc  : ${description}`,
              `og:image : ${img}`,
              `og:locale: ${lang === "en" ? "en_US" : "fr_FR"}`,
            ].join("\n");
            const ok = await copy(payload);
            toast[ok ? "success" : "error"](ok ? "Aperçu copié" : "Copie impossible");
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Copier l'aperçu
        </Button>
        <a
          href={fbDebug}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" /> Re-scraper Facebook
        </a>
        <a
          href={liDebug}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" /> LinkedIn
        </a>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ouvrir <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Aperçu attendu, façon carte sociale */}
      <div className="flex gap-3 rounded-md border bg-background p-2">
        <img
          src={img}
          alt={ogImageAlt(lang)}
          width={120}
          height={63}
          loading="lazy"
          className="h-16 w-[120px] shrink-0 rounded object-cover"
        />
        <div className="min-w-0 text-xs">
          <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">
            {shareUrl.replace(/^https?:\/\//, "")}
          </p>
          <p className="truncate font-semibold" title={title}>
            {title}
          </p>
          <p className="line-clamp-2 text-muted-foreground" title={description}>
            {description}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            og:locale {lang === "en" ? "en_US" : "fr_FR"} · visuel v{OG_ASSET_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
