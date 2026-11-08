import { Link } from "react-router";
import type { Route } from "./+types/_site.press._index";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { SanityImage } from "~/components/media/SanityImage";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { formatDate } from "~/lib/dates";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Press releases & sponsored", path: "/press" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [posts, country] = await Promise.all([getContentSource().listSponsoredPosts({ limit: 30 }), resolveCountry(request)]);
  return { posts, countryCode: country.code };
}

export function meta(_: Route.MetaArgs) {
  return buildMeta({
    title: "Press releases & sponsored content",
    description: "Paid and partner content, clearly labelled and kept separate from our newsroom.",
    path: "/press",
    jsonLd: graph(breadcrumbJsonLd(crumbs)),
  });
}

/** Separate index for sponsored content (CLAUDE.md §7.11). Never mixed into editorial lists. */
export default function PressIndex({ loaderData }: Route.ComponentProps) {
  const { posts, countryCode } = loaderData;
  return (
    <div className="container-content space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Press releases & sponsored content</h1>
        <p className="max-w-2xl text-muted">
          Everything on this page is paid for or supplied by the companies named. It is not written or checked by our
          newsroom and is not investment advice. Read our <Link className="underline" to="/standards#sponsored">sponsored content policy</Link>.
        </p>
      </header>
      {posts.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="press-list">
          {posts.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-brand border border-border bg-surface">
              <SanityImage image={p.heroImage} sizes="(min-width: 1024px) 380px, 100vw" className="aspect-[16/9]" />
              <div className="space-y-2 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-warning">
                  {p.kind === "pressRelease" ? "Press Release" : "Sponsored"} · {p.sponsorName}
                </p>
                <h2 className="text-lg font-semibold leading-snug">
                  <Link to={`/press/${p.slug}`} className="hover:text-signal-ink">{p.title}</Link>
                </h2>
                <p className="text-xs text-muted">
                  <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Nothing here yet.</p>
      )}
      <p className="text-sm">
        Want to publish here? See <Link to="/partners" className="underline">partner packages</Link>.
      </p>
      <NewsletterBox variant="page" country={countryCode} />
    </div>
  );
}
