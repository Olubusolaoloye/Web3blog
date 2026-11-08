import { getContentSource } from "~/lib/content/source.server";
import { NEWS_SITEMAP_WINDOW_MS, newsSitemap, xmlResponse } from "~/lib/seo/sitemap";

/** Editorial articles from the last 2 days (sponsored posts are never included). */
export async function loader() {
  const since = new Date(Date.now() - NEWS_SITEMAP_WINDOW_MS).toISOString();
  const { items } = await getContentSource().listArticles({ since, limit: 1000 });
  return xmlResponse(newsSitemap(items.map((a) => ({ path: `/news/${a.slug}`, title: a.title, publishedAt: a.publishedAt }))));
}
