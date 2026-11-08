import { data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/_site.authors.$slug";
import { ArticleCard } from "~/components/article/ArticleCard";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { SanityImage } from "~/components/media/SanityImage";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { breadcrumbJsonLd, graph, personJsonLd } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

export async function loader({ params, request }: Route.LoaderArgs) {
  const content = getContentSource();
  const [author, articles, country] = await Promise.all([
    content.getAuthor(params.slug),
    content.listArticles({ author: params.slug, limit: 12 }),
    resolveCountry(request),
  ]);
  if (!author) throw data(null, { status: 404 });
  return { author, articles: articles.items, countryCode: country.code };
}

const crumbsFor = (name: string, slug: string) => [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name, path: `/authors/${slug}` },
];

export function meta({ data: d, location }: Route.MetaArgs) {
  if (!d) return buildMeta({ title: "Author not found", path: location.pathname, noindex: true });
  const { author } = d;
  return buildMeta({
    title: `${author.name}, ${author.role}`,
    description: author.bio ?? `Articles by ${author.name}.`,
    path: `/authors/${author.slug}`,
    type: "website",
    jsonLd: graph(personJsonLd(author), breadcrumbJsonLd(crumbsFor(author.name, author.slug))),
  });
}

export default function AuthorPage({ loaderData }: Route.ComponentProps) {
  const { author, articles, countryCode } = loaderData;
  const socials = Object.entries(author.socials).filter(([, url]) => Boolean(url));
  return (
    <div className="container-content space-y-8 py-6 sm:py-8">
      <Breadcrumbs items={crumbsFor(author.name, author.slug)} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {author.photo ? (
          <div className="size-24 shrink-0 overflow-hidden rounded-full">
            <SanityImage image={author.photo} priority sizes="96px" className="size-24" />
          </div>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{author.name}</h1>
          <p className="text-muted">{author.role}</p>
          {socials.length ? (
            <ul className="flex gap-3 pt-1 text-sm">
              {socials.map(([network, url]) => (
                <li key={network}>
                  <a href={url} rel="noopener me" className="capitalize underline">{network === "x" ? "X" : network}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {author.bio ? (
          <section aria-labelledby="bio" className="space-y-2">
            <h2 id="bio" className="text-lg font-semibold">About</h2>
            <p>{author.bio}</p>
            {author.expertise.length ? (
              <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Expertise">
                {author.expertise.map((e) => (
                  <li key={e} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{e}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        <section id="holdings" aria-labelledby="holdings-heading" className="space-y-2 rounded-brand border border-border bg-surface p-4">
          <h2 id="holdings-heading" className="text-lg font-semibold">Holdings disclosure</h2>
          <p>{author.holdingsDisclosure ?? "No disclosure on file."}</p>
          <p className="text-xs text-muted">
            Our <a href="/standards#holdings" className="underline">holdings policy</a> explains what staff may own and trade.
          </p>
        </section>
      </div>

      <section aria-labelledby="by-author" className="space-y-4">
        <h2 id="by-author" className="text-xl font-semibold">Latest from {author.name}</h2>
        {articles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p className="text-muted">No articles yet.</p>
        )}
      </section>
      <NewsletterBox variant="page" country={countryCode} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound message="We couldn't find that author." />;
  throw error;
}
