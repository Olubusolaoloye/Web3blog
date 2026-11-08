import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/_site.news.$slug";
import { AuthorCard } from "~/components/article/AuthorCard";
import { BottomLine } from "~/components/article/BottomLine";
import { BodyHtml } from "~/components/article/BodyHtml";
import { RelatedStories } from "~/components/article/RelatedStories";
import { ShareButtons } from "~/components/article/ShareButtons";
import { SourceList } from "~/components/article/SourceList";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { PriceChip } from "~/components/market/PriceChip";
import { SanityImage } from "~/components/media/SanityImage";
import { readingTimeMinutes } from "~/lib/content/reading-time";
import { renderBodyHtml } from "~/lib/content/render-body.server";
import { getContentSource } from "~/lib/content/source.server";
import { splitBody } from "~/lib/content/split";
import type { Article } from "~/lib/content/types";
import { resolveCountry } from "~/lib/country.server";
import { formatDateTime } from "~/lib/dates";
import { getMockQuotes } from "~/lib/market/mock";
import { breadcrumbJsonLd, faqJsonLd, graph, newsArticleJsonLd } from "~/lib/seo/jsonld";
import { absoluteUrl, buildMeta } from "~/lib/seo/meta";

function crumbs(article: Pick<Article, "category" | "title" | "slug">) {
  return [
    { name: "Home", path: "/" },
    { name: "News", path: "/news" },
    ...(article.category ? [{ name: article.category.title, path: `/news?category=${article.category.slug}` }] : []),
    { name: article.title, path: `/news/${article.slug}` },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const content = getContentSource();
  const [article, country] = await Promise.all([content.getArticle(params.slug), resolveCountry(request)]);
  if (!article) throw data({ slug: params.slug }, { status: 404 });

  const related = await content.getRelatedArticles(article, 3);

  // Coins listed on the article plus any priceChip blocks in the body.
  const bodyCoins = article.body.flatMap((b) => {
    const coinId = (b as { coinId?: unknown }).coinId;
    return b._type === "priceChip" && typeof coinId === "string" ? [coinId] : [];
  });
  const coinIds = [...new Set([...article.coins, ...bodyCoins])];
  const quotes = Object.fromEntries(getMockQuotes(country.currency, coinIds).map((q) => [q.id, q]));

  const [bodyStart, bodyEnd] = splitBody(article.body);
  const opts = { quotes, locale: country.locale };
  // The body ships as HTML and the article without its body (keeps loader data and client JS small).
  const { body: _body, ...articleMeta } = article;
  return {
    article: articleMeta,
    bodyHtml: [renderBodyHtml(bodyStart, opts), renderBodyHtml(bodyEnd, opts)] as const,
    related,
    quotes,
    countryCode: country.code,
    locale: country.locale,
    readingTime: readingTimeMinutes(article.body),
    // JSON-LD is built on the server so the builders stay out of the browser bundle.
    jsonLd: graph(
      newsArticleJsonLd(article),
      breadcrumbJsonLd(crumbs(article)),
      ...(article.faq?.length ? [faqJsonLd(article.faq)] : []),
    ),
  };
}

export function meta({ data: loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return buildMeta({ title: "Article not found", path: location.pathname, noindex: true });
  const { article } = loaderData;
  return buildMeta({
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.bottomLine[0],
    path: `/news/${article.slug}`,
    image: `/og/article/${article.slug}.png`,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt ?? article.publishedAt,
    jsonLd: loaderData.jsonLd,
  });
}

export default function ArticlePage({ loaderData }: Route.ComponentProps) {
  const { article, bodyHtml, related, quotes, locale, readingTime, countryCode } = loaderData;
  const coinQuotes = article.coins.map((id) => quotes[id]).filter((q) => q !== undefined);
  const url = absoluteUrl(`/news/${article.slug}`);

  return (
    <article className="container-content py-6 sm:py-10">
      <Breadcrumbs items={crumbs(article)} />

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
              <span data-testid="updated-at">
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

        <BodyHtml html={bodyHtml[0]} />
        {bodyHtml[1] ? (
          <>
            <NewsletterBox variant="inline" country={countryCode} />
            <BodyHtml html={bodyHtml[1]} />
          </>
        ) : null}

        <ShareButtons url={url} title={article.title} bottomLine={article.bottomLine} />

        <SourceList sources={article.sources} />

        <div className="space-y-3">
          {article.authors.map((a) => (
            <AuthorCard key={a.slug} author={a} />
          ))}
          {article.editor ? <p className="text-sm text-muted">Edited by {article.editor.name}.</p> : null}
          <p className="text-xs text-muted">
            Spotted an error? <Link className="underline" to="/contact">Tell us</Link>. See our{" "}
            <Link className="underline" to="/corrections">corrections</Link> and{" "}
            <Link className="underline" to="/standards">editorial standards</Link>. Not financial advice.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[var(--container-content)] space-y-10">
        <RelatedStories articles={related} />
        <div className="mx-auto max-w-[var(--container-article)]">
          <NewsletterBox variant="end-of-article" country={countryCode} heading="Don't miss the next one" />
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
