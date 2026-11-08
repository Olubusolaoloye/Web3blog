import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/_site.news.$slug";
import { AuthorCard } from "~/components/article/AuthorCard";
import { BottomLine } from "~/components/article/BottomLine";
import { PortableBody } from "~/components/article/PortableBody";
import { SourceList } from "~/components/article/SourceList";
import { NotFound } from "~/components/layout/NotFound";
import { PriceChip } from "~/components/market/PriceChip";
import { SanityImage } from "~/components/media/SanityImage";
import { readingTimeMinutes } from "~/lib/content/reading-time";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { formatDateTime } from "~/lib/dates";
import { getMockQuotes } from "~/lib/market/mock";
import { buildMeta } from "~/lib/seo/meta";

export async function loader({ params, request }: Route.LoaderArgs) {
  const [article, country] = await Promise.all([getContentSource().getArticle(params.slug), resolveCountry(request)]);
  if (!article) throw data({ slug: params.slug }, { status: 404 });

  // Coins listed on the article plus any priceChip blocks in the body.
  const bodyCoins = article.body.flatMap((b) => {
    const coinId = (b as { coinId?: unknown }).coinId;
    return b._type === "priceChip" && typeof coinId === "string" ? [coinId] : [];
  });
  const coinIds = [...new Set([...article.coins, ...bodyCoins])];
  const quotes = Object.fromEntries(getMockQuotes(country.currency, coinIds).map((q) => [q.id, q]));

  return {
    article,
    quotes,
    locale: country.locale,
    readingTime: readingTimeMinutes(article.body),
  };
}

export function meta({ data: loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return buildMeta({ title: "Article not found", path: location.pathname, noindex: true });
  const { article } = loaderData;
  return buildMeta({
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.bottomLine[0],
    path: `/news/${article.slug}`,
    image: article.heroImage.url,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt ?? article.publishedAt,
  });
}

export default function ArticlePage({ loaderData }: Route.ComponentProps) {
  const { article, quotes, locale, readingTime } = loaderData;
  const coinQuotes = article.coins.map((id) => quotes[id]).filter((q) => q !== undefined);

  return (
    <article className="container-content py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          <li><Link to="/" className="hover:text-text">Home</Link> /</li>
          <li><Link to="/news" className="hover:text-text">News</Link>{article.category ? " /" : ""}</li>
          {article.category ? <li aria-current="page">{article.category.title}</li> : null}
        </ol>
      </nav>

      <div className="mx-auto max-w-[var(--container-article)] space-y-6">
        <header className="space-y-3">
          {article.isBreaking ? (
            <p className="inline-block rounded-full bg-alert px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-bg">
              Breaking
            </p>
          ) : null}
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl" data-testid="article-title">
            {article.title}
          </h1>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            <span>By {article.authors.map((a) => a.name).join(", ")}</span>
            <span>
              Published <time dateTime={article.publishedAt}>{formatDateTime(article.publishedAt)}</time>
            </span>
            {article.updatedAt && article.updatedAt !== article.publishedAt ? (
              <span>
                Updated <time dateTime={article.updatedAt}>{formatDateTime(article.updatedAt)}</time>
              </span>
            ) : null}
            <span>{readingTime} min read</span>
          </p>
        </header>

        <BottomLine points={article.bottomLine} />

        <figure className="overflow-hidden rounded-brand">
          <SanityImage image={article.heroImage} priority sizes="(min-width: 768px) 720px, 100vw" className="aspect-[16/9]" />
        </figure>

        {coinQuotes.length > 0 ? (
          <aside aria-label="Prices mentioned" className="flex flex-wrap gap-2">
            {coinQuotes.map((q) => (
              <PriceChip key={q.id} quote={q} locale={locale} />
            ))}
          </aside>
        ) : null}

        <PortableBody value={article.body} quotes={quotes} locale={locale} />

        <SourceList sources={article.sources} />

        <div className="space-y-3">
          {article.authors.map((a) => (
            <AuthorCard key={a.slug} author={a} />
          ))}
          {article.editor ? <p className="text-sm text-muted">Edited by {article.editor.name}.</p> : null}
        </div>
      </div>
    </article>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound message="That article doesn't exist or has been moved." />;
  }
  throw error;
}
