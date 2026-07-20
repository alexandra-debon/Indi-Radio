// Auto image optimization: chooses best format (AVIF > WebP > original) and
// target resolution based on usage preset.

export type ImageUsage = "thumbnail" | "banner" | "cover" | "generic";

export interface UsagePreset {
  maxDim: number;
  ratio: number | null;
  quality: number;
}

export const USAGE_PRESETS: Record<ImageUsage, UsagePreset> = {
  thumbnail: { maxDim: 480, ratio: 1, quality: 0.78 },
  banner: { maxDim: 1600, ratio: 16 / 9, quality: 0.8 },
  cover: { maxDim: 1200, ratio: 4 / 5, quality: 0.82 },
  generic: { maxDim: 1600, ratio: null, quality: 0.82 },
};

export const USAGE_LABEL: Record<ImageUsage, string> = {
  thumbnail: "Vignette",
  banner: "Bannière",
  cover: "Cover",
  generic: "Générique",
};

let avifPromise: Promise<boolean> | null = null;

export function supportsAvifEncoding(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (avifPromise) return avifPromise;
  avifPromise = (async () => {
    try {
      const c = document.createElement("canvas");
      c.width = 2; c.height = 2;
      const blob: Blob | null = await new Promise((resolve) =>
        c.toBlob((b) => resolve(b), "image/avif", 0.5),
      );
      return !!blob && blob.type === "image/avif";
    } catch {
      return false;
    }
  })();
  return avifPromise;
}

export interface OptimizeResult {
  blob: Blob;
  ext: string;
  type: string;
  width: number;
  height: number;
}

export interface OptimizeOptions {
  /** Usage preset — sets ratio, maxDim, quality. Ignored when auto=false. */
  usage?: ImageUsage;
  /** Override ratio (used when auto=false). */
  ratio?: number | null;
  /** Override max dimension (used when auto=false). */
  maxDim?: number;
  /** Override quality. */
  quality?: number;
  /** Enable smart format + resolution picker. Default true. */
  auto?: boolean;
}

export async function optimizeImageSmart(
  file: File,
  opts: OptimizeOptions = {},
): Promise<OptimizeResult> {
  // Pass-through for vector/animated
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { blob: file, ext: file.type === "image/svg+xml" ? "svg" : "gif", type: file.type, width: 0, height: 0 };
  }

  const auto = opts.auto !== false;
  const preset = USAGE_PRESETS[opts.usage ?? "generic"];
  const ratio = auto ? preset.ratio : (opts.ratio ?? null);
  const maxDim = auto ? preset.maxDim : (opts.maxDim ?? 1600);
  const quality = opts.quality ?? preset.quality;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: 0, height: 0 };
  }
  const { width: w0, height: h0 } = bitmap;
  let sx = 0, sy = 0, sw = w0, sh = h0;
  if (ratio && ratio > 0) {
    const cur = w0 / h0;
    if (cur > ratio) { sw = Math.round(h0 * ratio); sx = Math.round((w0 - sw) / 2); }
    else if (cur < ratio) { sh = Math.round(w0 / ratio); sy = Math.round((h0 - sh) / 2); }
  }
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close?.();

  const tryEncode = (type: string, q: number): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, q));

  const candidates: { type: string; ext: string }[] = [];
  if (await supportsAvifEncoding()) candidates.push({ type: "image/avif", ext: "avif" });
  candidates.push({ type: "image/webp", ext: "webp" });

  let best: OptimizeResult | null = null;
  for (const c of candidates) {
    const blob = await tryEncode(c.type, quality);
    if (!blob) continue;
    if (!best || blob.size < best.blob.size) best = { blob, ext: c.ext, type: c.type, width: w, height: h };
  }

  // Fallback: keep original when nothing worked, or when auto+free ratio makes output bigger.
  if (!best) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: w0, height: h0 };
  if (ratio == null && best.blob.size > file.size) {
    return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: w0, height: h0 };
  }
  return best;
}