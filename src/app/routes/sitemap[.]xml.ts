import { SITEMAP_SECTIONS, sitemapIndex, xmlResponse } from "~/lib/seo/sitemap";

export function loader() {
  return xmlResponse(sitemapIndex(SITEMAP_SECTIONS.map((s) => `/sitemaps/${s}.xml`)));
}
