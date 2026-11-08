import { Form, Link } from "react-router";
import type { Route } from "./+types/_site.news._index";
import { ArticleCard } from "~/components/article/ArticleCard";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Pagination } from "~/components/layout/Pagination";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";
import { cn } from "~/lib/utils";

const PAGE_SIZE = 12;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;
  const query = url.searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const content = getContentSource();
  const [categories, result, country] = await Promise.all([
    content.listCategories(),
    content.listArticles({ category, query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    resolveCountry(request),
  ]);
  const activeCategory = categories.find((c) => c.slug === category);
  return {
    categories,
    activeCategory,
    query,
    page,
    totalPages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
    articles: result.items,
    total: result.total,
    countryCode: country.code,
  };
}

const crumbs = [
  { name: "Home", path: "/" },
  { name: "News", path: "/news" },
];

export function meta({ data: d, location }: Route.MetaArgs) {
  const title = d?.activeCategory ? `${d.activeCategory.title} news` : "Latest crypto news";
  const params = new URLSearchParams(location.search);
  // Category pages are canonical; search results and deep pages are noindex to avoid thin duplicates.
  const canonical = d?.activeCategory ? `/news?category=${d.activeCategory.slug}` : "/news";
  return buildMeta({
    title: d?.page && d.page > 1 ? `${title} (page ${d.page})` : title,
    description: "Sourced crypto news for Nigeria, Kenya, South Africa and Ghana, with a Bottom Line on every story.",
    path: canonical,
    noindex: params.has("q") || (d?.page ?? 1) > 1,
    jsonLd: graph(breadcrumbJsonLd(crumbs)),
  });
}

export default function NewsIndex({ loaderData }: Route.ComponentProps) {
  const { categories, activeCategory, query, page, totalPages, articles, total, countryCode } = loaderData;
  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    if (activeCategory) sp.set("category", activeCategory.slug);
    if (query) sp.set("q", query);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/news?${s}` : "/news";
  };
  const chip = (active: boolean) =>
    cn(
      "inline-block whitespace-nowrap rounded-full border px-3 py-1.5 text-sm",
      active ? "border-signal-ink bg-surface-2 font-semibold" : "border-border hover:bg-surface-2",
    );

  return (
    <div className="container-content space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{activeCategory ? `${activeCategory.title} news` : "Latest news"}</h1>
        <p className="text-muted">Every story is sourced and starts with The Bottom Line.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Categories">
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <li>
              <Link to="/news" className={chip(!activeCategory)} aria-current={!activeCategory ? "page" : undefined}>
                All
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/news?category=${c.slug}`}
                  className={chip(activeCategory?.slug === c.slug)}
                  aria-current={activeCategory?.slug === c.slug ? "page" : undefined}
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Form method="get" role="search" className="flex gap-2">
          {activeCategory ? <input type="hidden" name="category" value={activeCategory.slug} /> : null}
          <label htmlFor="news-search" className="sr-only">Search news</label>
          <input
            id="news-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search news"
            className="h-10 w-full rounded-brand border border-border bg-surface px-3 md:w-64"
          />
          <button type="submit" className="h-10 rounded-brand border border-border px-4 text-sm hover:bg-surface-2">
            Search
          </button>
        </Form>
      </div>

      {query ? (
        <p className="text-sm text-muted" role="status">
          {total} result{total === 1 ? "" : "s"} for “{query}”
        </p>
      ) : null}

      {articles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="news-list">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} priority={i === 0 && page === 1} headingLevel={2} />
          ))}
        </div>
      ) : (
        <div className="rounded-brand border border-dashed border-border p-8 text-center">
          <p className="font-semibold">No stories found.</p>
          <p className="mt-1 text-sm text-muted">
            Try another search or <Link to="/news" className="underline">see all news</Link>.
          </p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      <NewsletterBox variant="page" country={countryCode} />
    </div>
  );
}
