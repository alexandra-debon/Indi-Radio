/**
 * Vignette de partage automatique pour une publication du mur.
 *
 * Chaîne de repli (comme les articles RéDaK'Village et les magazines) :
 *   1. vignette de partage explicite (og_image_url) ;
 *   2. première image de la publication ;
 *   3. miniature de la vidéo YouTube liée dans le texte ;
 *   4. couverture de l'album photo associé ;
 *   5. image de partage générique du site, localisée.
 */
import { extractUrls, parseMediaUrl } from "@/lib/media-embed";
import { ogImageForLang, type OgImgLang } from "@/lib/og-image";

export type PostShareSource = {
  og_image_url?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  content?: string | null;
  album?: { cover_url?: string | null } | null;
};

export type PostShareImage = {
  /** URL de la vignette (toujours définie). */
  image: string;
  /** Vrai si la vignette est au format paysage adapté à twitter:card large. */
  landscape: boolean;
  /** Vrai si la vignette est générée automatiquement (pas déposée par l'auteur). */
  auto: boolean;
};

/** Miniature d'une vidéo YouTube citée dans le texte de la publication. */
export function postVideoThumbnail(content: string | null | undefined): string | null {
  for (const url of extractUrls(content || "")) {
    const media = parseMediaUrl(url);
    if (media && media.kind === "youtube" && media.type === "video") {
      return `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`;
    }
  }
  return null;
}

export function postShareImage(post: PostShareSource, lang: OgImgLang = "fr"): PostShareImage {
  if (post.og_image_url) return { image: post.og_image_url, landscape: true, auto: false };

  const own = post.image_url || post.image_urls?.[0] || null;
  if (own) return { image: own, landscape: false, auto: true };

  const video = postVideoThumbnail(post.content);
  if (video) return { image: video, landscape: true, auto: true };

  if (post.album?.cover_url) return { image: post.album.cover_url, landscape: false, auto: true };

  return { image: ogImageForLang(lang), landscape: true, auto: true };
}
