/**
 * Vignette de partage automatique pour une vidéo InDi TeeVi.
 *
 * Chaîne de repli :
 *   1. vignette de partage explicite (og_image_url, déposée par l'équipe) ;
 *   2. miniature de la vidéo Vimeo (récupérée automatiquement) ;
 *   3. image de partage générique du site, localisée.
 */
import { parseMediaUrl } from "@/lib/media-embed";
import { ogImageForLang, type OgImgLang } from "@/lib/og-image";

export type TeeviShareSource = {
  og_image_url?: string | null;
  video_url?: string | null;
};

export type TeeviShareImage = {
  image: string;
  landscape: boolean;
  auto: boolean;
};

/** Miniature paysage d'une vidéo Vimeo, déduite de son identifiant. */
export function vimeoThumbnail(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const media = parseMediaUrl(videoUrl);
  if (!media || media.kind !== "vimeo") return null;
  return `https://vumbnail.com/${media.id}.jpg`;
}

/** Miniature officielle via l'oEmbed Vimeo (meilleure qualité, appel réseau). */
export async function fetchVimeoThumbnail(videoUrl: string): Promise<string | null> {
  const media = parseMediaUrl(videoUrl);
  if (!media || media.kind !== "vimeo") return null;
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(videoUrl)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { thumbnail_url?: string };
    return json.thumbnail_url || null;
  } catch {
    return null;
  }
}

export function teeviShareImage(
  video: TeeviShareSource,
  lang: OgImgLang = "fr",
): TeeviShareImage {
  if (video.og_image_url) return { image: video.og_image_url, landscape: true, auto: false };
  const thumb = vimeoThumbnail(video.video_url);
  if (thumb) return { image: thumb, landscape: true, auto: true };
  return { image: ogImageForLang(lang), landscape: true, auto: true };
}
