import { Facebook, Instagram, Youtube, Music2, ExternalLink } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type SocialLinks = Partial<Record<SocialKey, string>>;

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

export const SOCIAL_META: Record<SocialKey, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; placeholder: string }> = {
  facebook: { label: "Facebook", Icon: Facebook, color: "#1877F2", placeholder: "https://facebook.com/…" },
  instagram: { label: "Instagram", Icon: Instagram, color: "#E4405F", placeholder: "https://instagram.com/…" },
  tiktok: { label: "TikTok", Icon: TikTokIcon, color: "#000000", placeholder: "https://tiktok.com/@…" },
  youtube: { label: "YouTube", Icon: Youtube, color: "#FF0000", placeholder: "https://youtube.com/…" },
  bandcamp: { label: "Bandcamp", Icon: BandcampIcon, color: "#1DA0C3", placeholder: "https://artist.bandcamp.com/…" },
  apple_music: { label: "Apple Music", Icon: Music2, color: "#FA243C", placeholder: "https://music.apple.com/…" },
  deezer: { label: "Deezer", Icon: Music2, color: "#A238FF", placeholder: "https://deezer.com/…" },
  soundcloud: { label: "SoundCloud", Icon: Music2, color: "#FF5500", placeholder: "https://soundcamp.com/…" },
  spotify: { label: "Spotify", Icon: Music2, color: "#1DB954", placeholder: "https://open.spotify.com/…" },
};

export function normalizeUrl(u: string): string | null {
  const s = u.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function SocialLinksBar({ links, className = "" }: { links: SocialLinks | null | undefined; className?: string }) {
  if (!links) return null;
  const entries = SOCIAL_KEYS
    .map((k) => [k, links[k]] as const)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {entries.map(([key, url]) => {
        const meta = SOCIAL_META[key];
        const href = normalizeUrl(url!) ?? "#";
        const Icon = meta.Icon;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={meta.label}
            title={meta.label}
            className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:scale-110 hover:text-white"
            style={{ ["--hover-bg" as any]: meta.color }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = meta.color)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
          >
            <Icon className="size-4" aria-hidden />
            <ExternalLink className="sr-only" />
          </a>
        );
      })}
    </div>
  );
}

export function SocialLinksEditor({ value, onChange }: { value: SocialLinks; onChange: (v: SocialLinks) => void }) {
  return (
    <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Liens réseaux & plateformes (optionnel)</div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SOCIAL_KEYS.map((k) => {
          const meta = SOCIAL_META[k];
          const Icon = meta.Icon;
          return (
            <label key={k} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
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
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function sanitizeLinks(v: SocialLinks): SocialLinks {
  const out: SocialLinks = {};
  for (const k of SOCIAL_KEYS) {
    const val = v[k]?.trim();
    if (val) out[k] = val;
  }
  return out;
}