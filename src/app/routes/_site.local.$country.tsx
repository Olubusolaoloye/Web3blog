import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/_site.local.$country";
import { ArticleCard } from "~/components/article/ArticleCard";
import { BodyHtml } from "~/components/article/BodyHtml";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { StickyNewsletter } from "~/components/capture/StickyNewsletter";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { SampleDataNotice } from "~/components/market/SampleDataNotice";
import { Sparkline } from "~/components/market/Sparkline";
import { getCountry } from "~/config/countries";
import { site } from "~/config/site";
import { renderBodyHtml } from "~/lib/content/render-body.server";
import { getContentSource } from "~/lib/content/source.server";
import { formatDate, formatDateTime } from "~/lib/dates";
import { getDirectoryProvider } from "~/lib/directory/provider.server";
import { publicPageHeaders } from "~/lib/http/cache";
import { fxRate, p2pPremiumPct } from "~/lib/market/convert";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import { safeP2p } from "~/lib/market/p2p.server";
import { MarketService } from "~/lib/market/service.server";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

/** CLAUDE.md §7.4 price board. */
export const HUB_COINS = ["bitcoin", "ethereum", "tether", "solana", "binancecoin"] as const;

/**
 * Local hub. Renders only from config (`countries.ts`) + CMS (`country` doc, articles) + data providers
 * (prices, P2P, directory). No per-country copy lives in code, so adding a market is just data.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const country = getCountry(params.country);
  if (!country || params.country !== country.code) throw data(null, { status: 404 });
  const content = getContentSource();
  const doc = await content.getCountry(country.code);
  if (!doc) throw data(null, { status: 404 });

  const service = new MarketService();
  const [quotes, fx, p2p, stories, exchanges] = await Promise.all([
    service.quotes(country.currency, HUB_COINS).catch(() => []),
    service.fxRates().catch(() => undefined),
    safeP2p(country.code, "USDT"),
    content.listArticles({ country: country.code, limit: 6 }),
    getDirectoryProvider().verifiedBySlugs(doc.recommendedExchanges).catch(() => []),
  ]);
  const official = fx ? fxRate(fx, country.currency) : undefined;
  const opts = { quotes: {}, locale: country.locale };
  const crumbs = [
    { name: "Home", path: "/" },
    { name: `${country.name} hub`, path: `/local/${country.code}` },
  ];
  return {
    country,
    hubIntro: doc.hubIntro,
    regulationHtml: renderBodyHtml(doc.regulationStatus, opts),
    regulationUpdatedAt: doc.regulationUpdatedAt,
    taxHtml: renderBodyHtml(doc.taxGuide, opts),
    quotes,
    p2p: p2p ? { ...p2p, premiumPct: official ? p2pPremiumPct(p2p.buy, official) : null } : undefined,
    official,
    stories: stories.items,
    exchanges,
    crumbs,
    sample: service.sample,
    jsonLd: graph(breadcrumbJsonLd(crumbs)),
  };
}

export const headers: Route.HeadersFunction = publicPageHeaders;

export function meta({ data: d, location }: Route.MetaArgs) {
  if (!d) return buildMeta({ title: "Not found", path: location.pathname, noindex: true });
  return buildMeta({
    title: `Crypto in ${d.country.name}: ${d.country.currency} prices, P2P rates and rules`,
    description: d.hubIntro ?? `Crypto prices in ${d.country.currency}, P2P rates, regulation and tax for ${d.country.name}.`,
    path: `/local/${d.country.code}`,
    jsonLd: d.jsonLd,
  });
}

export default function LocalHub({ loaderData }: Route.ComponentProps) {
  const { country, hubIntro, regulationHtml, regulationUpdatedAt, taxHtml, quotes, p2p, official, stories, exchanges, crumbs, sample } = loaderData;
  const money = (n: number) => formatPrice(n, country.currency, country.locale);
  return (
    <div className="container-content space-y-10 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-2">
        <p className="text-5xl" aria-hidden>{country.flag}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Crypto in {country.name}</h1>
        {hubIntro ? <p className="max-w-2xl text-lg text-muted">{hubIntro}</p> : null}
      </header>
      <SampleDataNotice show={sample} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="price-board" className="space-y-3">
          <h2 id="price-board" className="text-xl font-semibold">Prices in {country.currency}</h2>
          <ul className="divide-y divide-border rounded-brand border border-border bg-surface" data-testid="price-board">
            {quotes.map((q) => {
              const dir = changeDirection(q.change24h);
              return (
                <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link to={`/markets/${q.id}/to/${country.currency.toLowerCase()}`} className="min-w-0 hover:text-signal-ink">
                    <span className="font-semibold">{q.symbol}</span> <span className="text-sm text-muted">{q.name}</span>
                  </Link>
                  {q.spark ? <Sparkline values={q.spark} width={72} height={24} className="hidden sm:block" /> : null}
                  <span className="tabular text-right">
                    <span className="block font-semibold">{money(q.price)}</span>
                    <span className={`text-xs ${dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-muted"}`}>
                      {formatChange(q.change24h, country.locale)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {quotes.length === 0 ? <p className="text-sm text-muted">Prices are temporarily unavailable.</p> : null}
        </section>

        <section aria-labelledby="p2p-card" className="space-y-3" data-testid="p2p-card">
          <h2 id="p2p-card" className="text-xl font-semibold">USDT P2P rate</h2>
          {p2p ? (
            <div className="space-y-3 rounded-brand border border-border bg-surface p-4">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted">Buy</dt>
                  <dd className="tabular text-xl font-semibold">{money(p2p.buy)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Sell</dt>
                  <dd className="tabular text-xl font-semibold">{money(p2p.sell)}</dd>
                </div>
              </dl>
              {official && p2p.premiumPct !== null ? (
                <p className="text-sm">
                  Official rate {money(official)} · P2P premium{" "}
                  <strong>
                    {p2p.premiumPct >= 0 ? "+" : ""}
                    {p2p.premiumPct.toFixed(1)}%
                  </strong>
                </p>
              ) : null}
              <p className="text-xs text-muted">
                Source: {p2p.source}. Last updated <time dateTime={p2p.capturedAt}>{formatDateTime(p2p.capturedAt)}</time>.
              </p>
            </div>
          ) : (
            <p className="rounded-brand border border-dashed border-border p-4 text-sm text-muted">No P2P rate recorded yet.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="regulation" className="space-y-2 rounded-brand border border-border bg-surface p-4" data-testid="regulation">
          <h2 id="regulation" className="text-xl font-semibold">Regulation status</h2>
          <div className="prose-article text-base">
            <BodyHtml html={regulationHtml} />
          </div>
          {regulationUpdatedAt ? <p className="text-xs text-muted">Last reviewed {formatDate(regulationUpdatedAt)}</p> : null}
        </section>
        <section aria-labelledby="tax" className="space-y-2 rounded-brand border border-border bg-surface p-4">
          <h2 id="tax" className="text-xl font-semibold">Tax guide</h2>
          <div className="prose-article text-base">
            <BodyHtml html={taxHtml} />
          </div>
          <p className="text-xs text-muted">General information, not tax advice.</p>
        </section>
      </div>

      {exchanges.length ? (
        <section aria-labelledby="exchanges" className="space-y-3">
          <h2 id="exchanges" className="text-xl font-semibold">Recommended exchanges</h2>
          <p className="text-sm text-muted">Verified directory listings only. We check company details; we don't vouch for prices or service.</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="recommended-exchanges">
            {exchanges.map((e) => (
              <li key={e.slug} className="rounded-brand border border-border bg-surface p-4">
                <p className="flex items-center justify-between font-semibold">
                  {e.name}
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs capitalize text-signal-ink">{e.tier}</span>
                </p>
                {e.description ? <p className="mt-1 text-sm text-muted">{e.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stories.length ? (
        <section aria-labelledby="local-stories" className="space-y-3">
          <h2 id="local-stories" className="text-xl font-semibold">Latest from {country.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="community" className="rounded-brand border border-border bg-surface p-4 sm:p-6">
        <h2 id="community" className="text-xl font-semibold">Join the {country.name} community</h2>
        <p className="mt-1 text-sm text-muted">Price alerts, scam warnings and local news, straight to your phone.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={site.socials.whatsapp} rel="noopener" className="inline-flex h-10 items-center rounded-brand bg-signal px-4 font-semibold text-on-signal">
            Join on WhatsApp
          </a>
          <a href={site.socials.telegram} rel="noopener" className="inline-flex h-10 items-center rounded-brand border border-border px-4 font-semibold">
            Join on Telegram
          </a>
        </div>
      </section>

      <NewsletterBox variant="page" country={country.code} heading={`Get the ${country.name} brief`} />
      <StickyNewsletter country={country.code} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound message="We don't have a hub for that country yet." />;
  throw error;
}
