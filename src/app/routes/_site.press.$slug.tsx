import { data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/_site.press.$slug";
import { BottomLine } from "~/components/article/BottomLine";
import { BodyHtml } from "~/components/article/BodyHtml";
import { SourceList } from "~/components/article/SourceList";
import { SponsoredLabel } from "~/components/article/SponsoredLabel";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { SanityImage } from "~/components/media/SanityImage";
import { renderBodyHtml } from "~/lib/content/render-body.server";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { formatDateTime } from "~/lib/dates";
import { getMockQuotes } from "~/lib/market/mock";
import { breadcrumbJsonLd, graph, sponsoredArticleJsonLd } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

export async function loader({ params, request }: Route.LoaderArgs) {
  const [post, country] = await Promise.all([getContentSource().getSponsoredPost(params.slug), resolveCountry(request)]);
  if (!post) throw data(null, { status: 404 });
  const quotes = Object.fromEntries(getMockQuotes(country.currency, post.coins).map((q) => [q.id, q]));
  const { body, ...postMeta } = post;
  return {
    post: postMeta,
    // Every outbound link in paid content is rel="sponsored nofollow" (rule 2).
    bodyHtml: renderBodyHtml(body, { quotes, locale: country.locale, sponsored: true }),
    countryCode: country.code,
    // Article, never NewsArticle, for paid content (CLAUDE.md §7.11).
    jsonLd: graph(sponsoredArticleJsonLd(post), breadcrumbJsonLd(crumbsFor(post.title, post.slug))),
  };
}

const crumbsFor = (title: string, slug: string) => [
  { name: "Home", path: "/" },
  { name: "Press", path: "/press" },
  { name: title, path: `/press/${slug}` },
];

export function meta({ data: d, location }: Route.MetaArgs) {
  if (!d) return buildMeta({ title: "Not found", path: location.pathname, noindex: true });
  const { post } = d;
  return buildMeta({
    title: `${post.kind === "pressRelease" ? "Press release" : "Sponsored"}: ${post.title}`,
    description: post.bottomLine[0],
    path: `/press/${post.slug}`,
    image: `/og/press/${post.slug}.png`,
    type: "article",
    noindex: post.noindex,
    publishedTime: post.publishedAt,
    jsonLd: d.jsonLd,
  });
}

export default function PressPost({ loaderData }: Route.ComponentProps) {
  const { post, bodyHtml, countryCode } = loaderData;
  return (
    <article className="container-content py-6 sm:py-10">
      <Breadcrumbs items={crumbsFor(post.title, post.slug)} />
      <div className="mx-auto max-w-[var(--container-article)] space-y-6">
        <SponsoredLabel kind={post.kind} sponsorName={post.sponsorName} disclosureText={post.disclosureText} />
        <header className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
          <p className="text-sm text-muted">
            Supplied by {post.sponsorName} · <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
          </p>
        </header>
        <BottomLine points={post.bottomLine} />
        <figure className="overflow-hidden rounded-brand">
          <SanityImage image={post.heroImage} priority sizes="(min-width: 768px) 720px, 100vw" className="aspect-[16/9]" />
        </figure>
        <BodyHtml html={bodyHtml} />
        <SourceList sources={post.sources} sponsored />
        <NewsletterBox variant="end-of-article" country={countryCode} />
      </div>
    </article>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  throw error;
}
