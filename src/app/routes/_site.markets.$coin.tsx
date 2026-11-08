import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/_site.markets.$coin";
import { ArticleCard } from "~/components/article/ArticleCard";
import { SafetyBadge } from "~/components/article/SafetyBadge";
import { AlertCTA } from "~/components/capture/AlertCTA";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { PriceChart } from "~/components/market/PriceChart";
import { PriceChip } from "~/components/market/PriceChip";
import { SampleDataNotice } from "~/components/market/SampleDataNotice";
import { launchedCountries } from "~/config/countries";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { publicPageHeaders } from "~/lib/http/cache";
import { scannableContract } from "~/lib/market/chains";
import { toLocalQuote } from "~/lib/market/convert";
import { formatChange, formatPrice } from "~/lib/market/format";
import { MarketService } from "~/lib/market/service.server";
import { chartRanges, type ChartRange } from "~/lib/market/types";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";
import { cn } from "~/lib/utils";

const RANGE_LABEL: Record<ChartRange, string> = { "1d": "1D", "7d": "7D", "1m": "1M", "1y": "1Y" };

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const r = url.searchParams.get("range");
  const range: ChartRange = (chartRanges as readonly string[]).includes(r ?? "") ? (r as ChartRange) : "7d";
  const country = await resolveCountry(request);
  const service = new MarketService();
  const [{ market, detail }, fx] = await Promise.all([service.coin(params.coin), service.fxRates()]);
  // Coin pages exist for coins in the cached top 250; anything else is a 404 (no thin pages).
  if (!market) throw data(null, { status: 404 });

  const [chart, related] = await Promise.all([
    service.chart(market.id, range, country.currency),
    getContentSource().listArticles({ coin: market.id, limit: 3 }),
  ]);
  const quote = toLocalQuote(market, country.currency, fx);
  const allCurrencies = launchedCountries.map((c) => ({
    code: c.code,
    flag: c.flag,
    name: c.name,
    currency: c.currency,
    locale: c.locale,
    quote: toLocalQuote(market, c.currency, fx),
  }));
  const contract = detail ? scannableContract(detail.platforms) : undefined;
  return {
    coin: { id: market.id, name: market.name, symbol: market.symbol, rank: market.rank, change7d: market.change7d },
    quote,
    detail,
    stats: {
      marketCap: market.marketCapUsd * (quote.price / market.priceUsd || 0),
      volume: market.volumeUsd * (quote.price / market.priceUsd || 0),
      ath: detail?.athUsd ? detail.athUsd * (quote.price / market.priceUsd || 0) : null,
    },
    allCurrencies,
    chart,
    range,
    related: related.items,
    contract,
    currency: country.currency,
    locale: country.locale,
    countryCode: country.code,
    sample: service.sample,
  };
}

export const headers: Route.HeadersFunction = publicPageHeaders;

const crumbsFor = (name: string, id: string) => [
  { name: "Home", path: "/" },
  { name: "Markets", path: "/markets" },
  { name, path: `/markets/${id}` },
];

export function meta({ data: d, location }: Route.MetaArgs) {
  if (!d) return buildMeta({ title: "Coin not found", path: location.pathname, noindex: true });
  const { coin } = d;
  return buildMeta({
    title: `${coin.name} (${coin.symbol}) price today in naira, shillings, rand and cedis`,
    description: `Live ${coin.name} price in NGN, KES, ZAR and GHS, with charts, market data and related news.`,
    path: `/markets/${coin.id}`,
    noindex: d.range !== "7d",
    jsonLd: graph(breadcrumbJsonLd(crumbsFor(coin.name, coin.id))),
  });
}

export default function CoinPage({ loaderData }: Route.ComponentProps) {
  const { coin, quote, detail, stats, allCurrencies, chart, range, related, contract, currency, locale, countryCode, sample } = loaderData;
  const stat = (label: string, value: string) => (
    <div className="rounded-brand border border-border bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-1 font-semibold">{value}</dd>
    </div>
  );
  const supply = (n: number | null | undefined) =>
    n ? `${new Intl.NumberFormat(locale, { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)} ${coin.symbol}` : "–";

  return (
    <div className="container-content space-y-8 py-6 sm:py-8">
      <Breadcrumbs items={crumbsFor(coin.name, coin.id)} />
      <SampleDataNotice show={sample} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">#{coin.rank} by market cap</p>
          <h1 className="text-3xl font-bold">
            {coin.name} <span className="text-muted">{coin.symbol}</span>
          </h1>
          <p className="tabular text-3xl font-semibold" data-testid="coin-price">
            {formatPrice(quote.price, currency, locale)}
          </p>
          <p className="text-sm">
            <PriceChip quote={quote} locale={locale} /> <span className="text-muted">24h change</span>
          </p>
        </div>
        {contract ? (
          <SafetyBadge
            level="unknown"
            label="Scan this token"
            href={`/safety/scanner?chain=${contract.chain}&address=${encodeURIComponent(contract.address)}`}
          />
        ) : null}
      </header>

      <section aria-labelledby="chart-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="chart-heading" className="text-lg font-semibold">Price chart ({currency})</h2>
          <nav aria-label="Chart range" className="flex gap-1">
            {chartRanges.map((r) => (
              <Link
                key={r}
                to={r === "7d" ? `/markets/${coin.id}` : `/markets/${coin.id}?range=${r}`}
                preventScrollReset
                replace
                aria-current={range === r ? "true" : undefined}
                className={cn("rounded-full px-3 py-1 text-sm", range === r ? "bg-surface-2 font-semibold" : "text-muted hover:text-text")}
              >
                {RANGE_LABEL[r]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="rounded-brand border border-border bg-surface p-2">
          <PriceChart points={chart} currency={currency} locale={locale} label={`${coin.name} price, ${RANGE_LABEL[range]}`} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="stats" className="space-y-3">
            <h2 id="stats" className="text-lg font-semibold">Market stats</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stat("Market cap", formatPrice(stats.marketCap, currency, locale))}
              {stat("24h volume", formatPrice(stats.volume, currency, locale))}
              {stat("7d change", coin.change7d === null ? "–" : formatChange(coin.change7d, locale))}
              {stat("Circulating supply", supply(detail?.circulatingSupply))}
              {stat("Max supply", supply(detail?.maxSupply))}
              {stat("All-time high", stats.ath ? formatPrice(stats.ath, currency, locale) : "–")}
            </dl>
          </section>

          <section aria-labelledby="local-prices" className="space-y-3">
            <h2 id="local-prices" className="text-lg font-semibold">{coin.name} price in local currencies</h2>
            <ul className="grid gap-2 sm:grid-cols-2" data-testid="local-prices">
              {allCurrencies.map((c) => (
                <li key={c.code} className="flex items-center justify-between rounded-brand border border-border bg-surface p-3">
                  <span>
                    <span aria-hidden>{c.flag}</span> {c.name} ({c.currency})
                  </span>
                  <Link to={`/markets/${coin.id}/to/${c.currency.toLowerCase()}`} className="tabular font-semibold hover:text-signal-ink">
                    {formatPrice(c.quote.price, c.currency, c.locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {detail?.description ? (
            <section aria-labelledby="about" className="space-y-2">
              <h2 id="about" className="text-lg font-semibold">About {coin.name}</h2>
              {detail.description.split("\n\n").map((p) => (
                <p key={p.slice(0, 40)} className="text-muted">{p}</p>
              ))}
              {detail.homepage ? (
                <p className="text-sm">
                  <a href={detail.homepage} rel="noopener nofollow" target="_blank" className="underline">Official website</a>
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <AlertCTA symbol={coin.symbol} currency={currency} locale={locale} country={countryCode} currentPrice={quote.price} />
          {related.length ? (
            <section aria-labelledby="coin-news" className="space-y-3">
              <h2 id="coin-news" className="text-lg font-semibold">{coin.name} news</h2>
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </section>
          ) : null}
        </aside>
      </div>

      <p className="text-xs text-muted">Prices update every minute. Not financial advice.</p>
      <NewsletterBox variant="page" country={countryCode} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound message="We don't track that coin." />;
  throw error;
}
