/**
 * Image optimization helpers.
 *
 * - Rewrites Supabase Storage public URLs to the render/image endpoint
 *   so they are served resized and re-encoded (WebP when the client
 *   supports it, PNG/JPEG otherwise).
 * - Rewrites YouTube thumbnail URLs to the requested resolution
 *   (mqdefault, hqdefault, sddefault, maxresdefault).
 * - Leaves other URLs untouched.
 */

export interface ImgOpts {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: "cover" | "contain" | "fill";
}

export function optimizedImageUrl(src: string | null | undefined, opts: ImgOpts = {}): string | undefined {
  if (!src) return undefined;
  const { width, height, quality = 75, resize = "cover" } = opts;

  // Supabase Storage: /storage/v1/object/public/... → /storage/v1/render/image/public/...
  if (src.includes("/storage/v1/object/public/")) {
    const url = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const params = new URLSearchParams();
    if (width) params.set("width", String(Math.round(width)));
    if (height) params.set("height", String(Math.round(height)));
    params.set("resize", resize);
    params.set("quality", String(Math.min(100, Math.max(20, quality))));
    return `${url}?${params.toString()}`;
  }

  // YouTube thumbnails — pick a resolution that matches the requested width.
  const yt = src.match(/^(https?:\/\/i\.ytimg\.com\/vi\/[^/]+)\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault)\.jpg$/);
  if (yt && width) {
    const size = width >= 640 ? "sddefault" : width >= 480 ? "hqdefault" : width >= 320 ? "mqdefault" : "default";
    return `${yt[1]}/${size}.jpg`;
  }

  return src;
}

/**
 * Build a srcset for responsive Supabase images.
 */
export function optimizedSrcSet(src: string | null | undefined, widths: number[], opts: Omit<ImgOpts, "width"> = {}): string | undefined {
  if (!src) return undefined;
  return widths
    .map((w) => {
      const u = optimizedImageUrl(src, { ...opts, width: w });
      return u ? `${u} ${w}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}