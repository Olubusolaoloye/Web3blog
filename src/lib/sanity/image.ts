import imageUrlBuilder from "@sanity/image-url";
import { sanityConfig } from "./config";

const builder = sanityConfig.projectId
  ? imageUrlBuilder({ projectId: sanityConfig.projectId, dataset: sanityConfig.dataset })
  : undefined;

/** Builds a Sanity CDN URL at a given width. `auto=format` serves AVIF/WebP where supported. */
export function sanityImageUrl(assetRef: string, width: number): string | undefined {
  return builder?.image(assetRef).width(width).fit("max").auto("format").quality(75).url();
}
