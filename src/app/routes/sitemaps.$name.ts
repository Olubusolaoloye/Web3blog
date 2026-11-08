import type { Route } from "./+types/sitemaps.$name";
import { getContentSource } from "~/lib/content/source.server";
import { SITEMAP_SECTIONS, STATIC_PAGES, urlset, xmlResponse, type SitemapSection, type UrlEntry } from "~/lib/seo/sitemap";

const MAX_URLS = 50_000;

export async function loader({ params }: Route.LoaderArgs) {
  const section = params.name.replace(/\.xml$/, "") as SitemapSection;
  if (!SITEMAP_SECTIONS.includes(section)) return new Response("Not found", { status: 404 });
  const content = getContentSource();
  let entries: UrlEntry[] = [];

  if (section === "articles") {
    const { items } = await content.listArticles({ limit: MAX_URLS });
    entries = items.map((a) => ({ path: `/news/${a.slug}`, lastmod: a.updatedAt ?? a.publishedAt }));
  } else {
    const [authors, press] = await Promise.all([content.listAuthors(), content.listSponsoredPosts({ limit: 1000, includeNoindex: false })]);
    entries = [
      ...STATIC_PAGES.map((path) => ({ path })),
      ...authors.map((a) => ({ path: `/authors/${a.slug}` })),
      // /press items marked noindex are excluded (CLAUDE.md §9).
      ...press.map((p) => ({ path: `/press/${p.slug}`, lastmod: p.updatedAt ?? p.publishedAt })),
    ];
  }
  return xmlResponse(urlset(entries));
}
