import type { Route } from "./+types/sitemaps.$name";
import { launchedCountries } from "~/config/countries";
import { getContentSource } from "~/lib/content/source.server";
import { validConverterPairs } from "~/lib/market/converters.server";
import { MarketService } from "~/lib/market/service.server";
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
  } else if (section === "coins") {
    const coins = (await new MarketService().topCoins()).slice(0, 200);
    entries = coins.map((c) => ({ path: `/markets/${c.id}` }));
  } else if (section === "converters") {
    // Only pages with real local context (CLAUDE.md §7.3: no thin pages).
    entries = (await validConverterPairs()).map((p) => ({ path: `/markets/${p.coinId}/to/${p.currency}` }));
  } else if (section === "local") {
    const content = getContentSource();
    const docs = await Promise.all(launchedCountries.map(async (c) => [c.code, await content.getCountry(c.code)] as const));
    entries = docs.filter(([, doc]) => doc).map(([code, doc]) => ({ path: `/local/${code}`, lastmod: doc?.regulationUpdatedAt }));
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
