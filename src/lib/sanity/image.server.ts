import imageUrlBuilder from "@sanity/image-url";
import { sanityConfig } from "./config";

const builder = sanityConfig.projectId
  ? imageUrlBuilder({ projectId: sanityConfig.projectId, dataset: sanityConfig.dataset })
  : undefined;

/** Builds a Sanity CDN URL at a given width. `auto=format` serves AVIF/WebP where supported. Server only. */
export function sanityImageUrl(assetRef: string, width: number): string | undefined {
  return builder?.image(assetRef).width(width).fit("max").auto("format").quality(75).url();
}

const WIDTHS = [480, 768, 1024, 1440, 1920];

/**
 * Walks query results and, for every image with an `assetRef`, sets `url` (1024 px CDN URL) and `srcSet`.
 * Done on the server so the browser never ships the image URL builder (article JS budget, decision 29).
 */
export function decorateImages<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => decorateImages(v)) as T;
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = decorateImages(v);
  const ref = obj.assetRef;
  if (typeof ref === "string" && typeof obj.width === "number") {
    const width = obj.width;
    out.url = sanityImageUrl(ref, Math.min(1024, width)) ?? obj.url;
    out.srcSet = WIDTHS.filter((w) => w <= width)
      .map((w) => `${sanityImageUrl(ref, w)} ${w}w`)
      .join(", ");
  }
  return out as T;
}
