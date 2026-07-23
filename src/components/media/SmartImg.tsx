import * as React from "react";
import { optimizedImageUrl, optimizedSrcSet, type ImgOpts } from "@/lib/img";
import { cn } from "@/lib/utils";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "srcSet"> & {
  src: string | null | undefined;
  width: number;
  height: number;
  /** Target rendered size hint (falls back to width). */
  renderWidth?: number;
  quality?: number;
  resize?: ImgOpts["resize"];
  /** If true, emit fetchpriority="high" and eager loading. */
  priority?: boolean;
  /** srcset breakpoints — omit to skip srcset. */
  responsive?: number[];
  sizes?: string;
};

/**
 * <img> wrapper that:
 *  - always sets width/height (prevents CLS, satisfies image SEO checks)
 *  - rewrites Supabase URLs to the render/image endpoint (WebP-negotiated)
 *  - lazy-loads + async-decodes by default
 *  - can emit a responsive srcset
 */
export function SmartImg({
  src,
  width,
  height,
  renderWidth,
  quality,
  resize,
  priority,
  responsive,
  sizes,
  className,
  alt,
  loading,
  decoding,
  fetchPriority,
  ...rest
}: Props) {
  const targetW = renderWidth ?? width;
  const optimized = optimizedImageUrl(src ?? undefined, { width: targetW, height: undefined, quality, resize });
  const srcSet = responsive ? optimizedSrcSet(src ?? undefined, responsive, { quality, resize }) : undefined;

  return (
    <img
      {...rest}
      src={optimized}
      srcSet={srcSet}
      sizes={sizes ?? (responsive ? `${targetW}px` : undefined)}
      width={width}
      height={height}
      alt={alt ?? ""}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
      className={cn(className)}
    />
  );
}