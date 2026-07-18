import { Facebook, Instagram, Youtube, Music2, ExternalLink, ChevronUp, ChevronDown, X, Type } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import spotifyLogo from "@/assets/spotify-logo.jpeg.asset.json";
import deezerLogo from "@/assets/deezer-logo.jpeg.asset.json";
import appleMusicLogo from "@/assets/apple-music-logo.png.asset.json";
import soundcloudLogo from "@/assets/soundcloud-logo.jpeg.asset.json";

export type SocialLinks = Partial<Record<SocialKey, string>> & {
  __order?: SocialKey[];
  __labels?: Partial<Record<SocialKey, string>>;
};

export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "bandcamp",
  "apple_music",
  "deezer",
  "soundcloud",
  "spotify",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

function orderedKeys(links: SocialLinks): SocialKey[] {
  const ord = Array.isArray(links.__order) ? links.__order.filter((k): k is SocialKey => (SOCIAL_KEYS as readonly string[]).includes(k)) : [];
  const seen = new Set<SocialKey>(ord);
  const rest = SOCIAL_KEYS.filter((k) => !seen.has(k));
  return [...ord, ...rest];
}

const TikTokIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.6 6.3a5.4 5.4 0 0 1-3.4-1.2 5.4 5.4 0 0 1-2-3.6h-3.4v13.1a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V8.6a6 6 0 1 0 5.3 6V9.1a8.8 8.8 0 0 0 5.4 1.8V7.5c0-.4 0-.8 0-1.2Z" />
  </svg>
);

const BandcampIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z" />
  </svg>
);

function makeImgIcon(src: string, alt: string): ComponentType<SVGProps<SVGSVGElement>> {
  const Cmp = ({ className, style }: SVGProps<SVGSVGElement>) => (
    <img src={src} alt={alt} className={className as string | undefined} style={style as any} draggable={false} />
  );
  Cmp.displayName = `ImgIcon(${alt})`;
  return Cmp as unknown as ComponentType<SVGProps<SVGSVGElement>>;
}

export const SOCIAL_META: Record<SocialKey, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; placeholder: string; hasImage?: boolean }> = {
  facebook: { label: "Facebook", Icon: Facebook, color: "#1877F2", placeholder: "https://facebook.com/…" },
  instagram: { label: "Instagram", Icon: Instagram, color: "#E4405F", placeholder: "https://instagram.com/…" },
  tiktok: { label: "TikTok", Icon: TikTokIcon, color: "#000000", placeholder: "https://tiktok.com/@…" },
  youtube: { label: "YouTube", Icon: Youtube, color: "#FF0000", placeholder: "https://youtube.com/…" },
  bandcamp: { label: "Bandcamp", Icon: BandcampIcon, color: "#1DA0C3", placeholder: "https://artist.bandcamp.com/…" },
  apple_music: { label: "Apple Music", Icon: makeImgIcon(appleMusicLogo.url, "Apple Music"), color: "#FA243C", placeholder: "https://music.apple.com/…", hasImage: true },
  deezer: { label: "Deezer", Icon: makeImgIcon(deezerLogo.url, "Deezer"), color: "#A238FF", placeholder: "https://deezer.com/…", hasImage: true },
  soundcloud: { label: "SoundCloud", Icon: makeImgIcon(soundcloudLogo.url, "SoundCloud"), color: "#FF5500", placeholder: "https://soundcloud.com/…", hasImage: true },
  spotify: { label: "Spotify", Icon: makeImgIcon(spotifyLogo.url, "Spotify"), color: "#1DB954", placeholder: "https://open.spotify.com/…", hasImage: true },
};

export function normalizeUrl(u: string): string | null {
  const s = u.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function SocialLinksBar({ links, className = "" }: { links: SocialLinks | null | undefined; className?: string }) {
  if (!links) return null;
  const entries = orderedKeys(links)
    .map((k) => [k, links[k], links.__labels?.[k]] as const)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {entries.map(([key, url, label]) => {
        const meta = SOCIAL_META[key];
        const href = normalizeUrl(url!) ?? "#";
        const Icon = meta.Icon;
        const displayText = label?.trim() || meta.label;
        const hasLabel = !!label?.trim();
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={displayText}
            title={displayText}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background text-foreground transition hover:scale-105 hover:text-white ${hasLabel ? "h-8 px-2.5 text-xs" : "size-8"}`}
            style={{ ["--hover-bg" as any]: meta.color }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = meta.color)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
          >
            <Icon className="size-4" aria-hidden />
            {hasLabel && <span className="max-w-[10rem] truncate">{displayText}</span>}
            <ExternalLink className="sr-only" />
          </a>
        );
      })}
    </div>
  );
}

export function SocialLinksEditor({ value, onChange }: { value: SocialLinks; onChange: (v: SocialLinks) => void }) {
  const keys = orderedKeys(value);
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...keys];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ ...value, __order: next });
  };
  const remove = (k: SocialKey) => {
    const next = { ...value };
    delete (next as any)[k];
    const nextLabels = next.__labels ? { ...next.__labels } : undefined;
    if (nextLabels) {
      delete (nextLabels as any)[k];
      next.__labels = nextLabels;
    }
    if (Array.isArray(next.__order)) {
      next.__order = next.__order.filter((x) => x !== k);
    }
    onChange(next);
  };
  const setLabel = (k: SocialKey, label: string) => {
    onChange({
      ...value,
      __labels: { ...value.__labels, [k]: label },
    });
  };
  return (
    <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Liens réseaux & plateformes (optionnel) — utilisez les flèches pour réordonner</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {keys.map((k, idx) => {
          const meta = SOCIAL_META[k];
          const Icon = meta.Icon;
          const hasValue = typeof value[k] === "string" && value[k]!.trim().length > 0;
          return (
            <div key={k} className="rounded-md border border-border bg-background px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                >
                  <Icon className="size-3" />
                </span>
                <input
                  type="url"
                  value={value[k] ?? ""}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                  placeholder={meta.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => remove(k)}
                  disabled={!hasValue}
                  aria-label={`Retirer ${meta.label}`}
                  title={hasValue ? "Retirer ce lien" : "Aucun lien à retirer"}
                  className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                >
                  <X className="size-3.5" />
                </button>
                <div className="flex shrink-0 flex-col">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Monter ${meta.label}`} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === keys.length - 1} aria-label={`Descendre ${meta.label}`} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              </div>
              <label className="mt-1.5 flex items-center gap-2 border-t border-dashed border-border/60 pt-1.5">
                <Type className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="text"
                  value={value.__labels?.[k] ?? ""}
                  onChange={(e) => setLabel(k, e.target.value)}
                  placeholder={`Label affiché (défaut : ${meta.label})`}
                  className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/60"
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function sanitizeLinks(v: SocialLinks): SocialLinks {
  const out: SocialLinks = {};
  const labels: Partial<Record<SocialKey, string>> = {};
  for (const k of SOCIAL_KEYS) {
    const val = v[k]?.trim();
    if (val) {
      out[k] = val;
      const lbl = v.__labels?.[k]?.trim();
      if (lbl) labels[k] = lbl;
    }
  }
  if (Object.keys(labels).length > 0) out.__labels = labels;
  if (Array.isArray(v.__order)) {
    const filtered = v.__order.filter((k): k is SocialKey => (SOCIAL_KEYS as readonly string[]).includes(k) && !!out[k]);
    if (filtered.length > 0) out.__order = filtered;
  }
  return out;
}
