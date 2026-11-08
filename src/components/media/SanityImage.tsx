import type { ImageData } from "~/lib/content/types";
import { cn } from "~/lib/utils";

interface Props {
  image: ImageData;
  /** Only the article/home hero should set this (LCP image). */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Shared image component (CLAUDE.md §9): srcset from the Sanity CDN (AVIF/WebP via auto=format), explicit
 * width/height to prevent CLS, lazy by default, fetchpriority=high only for the hero. `url` and `srcSet` are
 * prepared on the server, so this component ships no image-URL builder to the browser.
 */
export function SanityImage({ image, priority = false, sizes = "100vw", className }: Props) {
  return (
    <img
      src={image.url}
      srcSet={image.srcSet || undefined}
      sizes={image.srcSet ? sizes : undefined}
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
