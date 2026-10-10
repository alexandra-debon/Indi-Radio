import { ogImageTags } from "@/lib/og-tags";

/**
 * Partage du morceau en cours : le lien reste la page d'accueil, avec
 * l'artiste, le titre et la pochette en paramètres (?artiste=&titre=&img=).
 * La page d'accueil lit ces paramètres pour fabriquer l'aperçu Facebook.
 */
const BASE_URL = "https://www.radio.indi-art-culture.com";

export function nowPlayingShareUrl(artist: string, title: string, artwork?: string | null): string {
  const qs = new URLSearchParams({ artiste: artist.slice(0, 120), titre: title.slice(0, 160) });
  if (artwork && /^https:\/\//i.test(artwork) && artwork.length < 600) qs.set("img", artwork);
  return `/?${qs.toString()}`;
}

export function nowPlayingLabel(lang: "fr" | "en"): string {
  return lang === "en" ? "Now on air on InDi RaDio" : "En ce moment à l’antenne d’InDi RaDio";
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

type Meta = Record<string, unknown>;

const REPLACED = new Set([
  "title",
  "description",
  "og:title",
  "og:description",
  "twitter:title",
  "twitter:description",
  "og:url",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:type",
  "og:image:alt",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:alt",
]);

/** Remplace titre / description / image de l'accueil quand un morceau est partagé. */
export function applyNowPlayingMeta(meta: Meta[], search: unknown): Meta[] {
  const s = (search ?? {}) as Record<string, unknown>;
  const artist = str(s.artiste, 120);
  const title = str(s.titre, 160);
  if (!artist || !title) return meta;
  const lang: "fr" | "en" = s.hl === "en" ? "en" : "fr";
  const img = str(s.img, 600);
  const safeImg = img && /^https:\/\//i.test(img) ? img : undefined;

  const ogTitle = `${nowPlayingLabel(lang)} : ${artist} — ${title}`;
  const desc =
    lang === "en"
      ? `Listen live to « ${title} » by ${artist} on InDi RaDio · free 24/7 radio, 100% indie music and culture, no ads.`
      : `Écoute en direct « ${title} » de ${artist} sur InDi RaDio · radio gratuite 24/7, 100 % musique et culture indé, sans pub.`;
  const url = `${BASE_URL}${nowPlayingShareUrl(artist, title, safeImg)}${lang === "en" ? "&hl=en" : ""}`;

  const kept = meta.filter((m) => {
    if (typeof m.title === "string") return false;
    const key = (m.property ?? m.name) as string | undefined;
    return !key || !REPLACED.has(key);
  });
  const extra: Meta[] = [
    { title: ogTitle },
    { name: "description", content: desc },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: desc },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: desc },
    { property: "og:url", content: url },
  ];
  if (safeImg) {
    extra.push(
      ...(ogImageTags(safeImg, { baseUrl: BASE_URL, width: 1200, height: 1200, alt: ogTitle }) as Meta[]),
    );
  } else {
    const fallback = meta.filter((m) => {
      const key = (m.property ?? m.name) as string | undefined;
      return key === "og:image" || key === "twitter:image" || key === "og:image:width" || key === "og:image:height";
    });
    extra.push(...fallback);
  }
  return [...kept, ...extra];
}
