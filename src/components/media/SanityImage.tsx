import { sanityImageUrl } from "~/lib/sanity/image";
import type { ImageData } from "~/lib/content/types";
import { cn } from "~/lib/utils";

const WIDTHS = [480, 768, 1024, 1440, 1920];

interface Props {
  image: ImageData;
  /** Only the article/home hero should set this (LCP image). */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Shared image component (CLAUDE.md §9): srcset from the Sanity CDN (AVIF/WebP via auto=format),
 * explicit width/height to prevent CLS, lazy by default, fetchpriority=high only for the hero.
 * Falls back to the plain URL for local fixture images.
 */
export function SanityImage({ image, priority = false, sizes = "100vw", className }: Props) {
  const ref = image.assetRef;
  const src = (ref && sanityImageUrl(ref, 1024)) || image.url;
  const srcSet = ref
    ? WIDTHS.filter((w) => w <= image.width)
        .map((w) => `${sanityImageUrl(ref, w)} ${w}w`)
        .join(", ")
    : undefined;

  return (
    <img
      src={src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      // Callers that set a height (h-*, size-*) replace the default h-auto; no class merging on the client.
      className={cn("w-full bg-surface-2 object-cover", !/(^|\s)(h|size)-/.test(className ?? "") && "h-auto", className)}
    />
  );
}
