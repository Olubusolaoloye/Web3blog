import type { MetaDescriptor } from "react-router";
import { site } from "~/config/site";

export interface BuildMetaInput {
  title: string;
  description?: string;
  /** Path starting with "/". Used for the canonical URL and og:url. */
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** Set true for the homepage so the title is not suffixed twice. */
  rawTitle?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${site.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Every route's `meta` export goes through this (CLAUDE.md §9). Full OG image routes arrive in Phase 2. */
export function buildMeta(input: BuildMetaInput): MetaDescriptor[] {
  const title = input.rawTitle ? input.title : site.titleTemplate(input.title);
  const description = input.description ?? site.description;
  const url = absoluteUrl(input.path);
  const tags: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:site_name", content: site.name },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: description },
    {
      name: "robots",
      content: input.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    },
  ];
  if (input.image) {
    const img = absoluteUrl(input.image);
    tags.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
  }
  if (input.publishedTime) tags.push({ property: "article:published_time", content: input.publishedTime });
  if (input.modifiedTime) tags.push({ property: "article:modified_time", content: input.modifiedTime });
  return tags;
}
