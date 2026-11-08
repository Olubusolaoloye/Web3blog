import { data, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/_site.markets.$coin_.to.$currency";
import { BodyHtml } from "~/components/article/BodyHtml";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFound } from "~/components/layout/NotFound";
import { Converter } from "~/components/market/Converter";
import { PriceChip } from "~/components/market/PriceChip";
import { SampleDataNotice } from "~/components/market/SampleDataNotice";
import { renderBodyHtml } from "~/lib/content/render-body.server";
import { publicPageHeaders } from "~/lib/http/cache";
import { coinSteps, fiatSteps, formatAmount } from "~/lib/market/amounts";
import { coinToFiat, fiatToCoin, fxRate, p2pPremiumPct, toLocalQuote } from "~/lib/market/convert";
import { resolveConverter } from "~/lib/market/converters.server";
import { formatPrice } from "~/lib/market/format";
import { safeP2p } from "~/lib/market/p2p.server";
import { MarketService } from "~/lib/market/service.server";
import { breadcrumbJsonLd, faqJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

const CURRENCY_NAMES: Record<string, string> = { NGN: "Nigerian naira", KES: "Kenyan shilling", ZAR: "South African rand", GHS: "Ghanaian cedi" };

export async function loader({ params }: Route.LoaderArgs) {
  const ctx = await resolveConverter(params.coin, params.currency);
  if (!ctx) throw data(null, { status: 404 });
  const { coin, country, doc } = ctx;
  const service = new MarketService();
  const [fx, p2p] = await Promise.all([service.fxRates(), safeP2p(country.code, "USDT")]);
  const cur = country.currency;
  const official = fxRate(fx, cur);
  const quote = toLocalQuote(coin, cur, fx);
  const currencyName = CURRENCY_NAMES[cur] ?? cur;
  const price = formatPrice(quote.price, cur, country.locale);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Markets", path: "/markets" },
    { name: coin.name, path: `/markets/${coin.id}` },
    { name: `${coin.symbol} to ${cur}`, path: `/markets/${coin.id}/to/${cur.toLowerCase()}` },
  ];
  const faq = [
    { question: `How much is 1 ${coin.symbol} in ${currencyName}?`, answer: `1 ${coin.symbol} is about ${price} at the latest rate. Prices change every minute.` },
  ];

  return {
    coin: { id: coin.id, name: coin.name, symbol: coin.symbol, priceUsd: coin.priceUsd },
    country: { code: country.code, name: country.name, flag: country.flag, locale: country.locale, currency: cur, currencyName },
    quote,
    officialRate: official,
    p2p: p2p
      ? { ...p2p, premiumPct: p2pPremiumPct(p2p.buy, official), coinViaP2p: coin.priceUsd * p2p.buy }
      : undefined,
    coinTable: coinSteps(coin.priceUsd).map((amount) => ({ amount, fiat: coinToFiat(amount, coin.priceUsd, cur, fx) })),
    fiatTable: fiatSteps(official).map((amount) => ({ amount, coin: fiatToCoin(amount, coin.priceUsd, cur, fx) })),
    howToBuyHtml: renderBodyHtml(doc.howToBuy, { quotes: {}, locale: country.locale }),
    regulationUpdatedAt: doc.regulationUpdatedAt,
    crumbs,
    sample: service.sample,
    jsonLd: graph(breadcrumbJsonLd(crumbs), faqJsonLd(faq)),
  };
}

export const headers: Route.HeadersFunction = publicPageHeaders;

export function meta({ data: d, location }: Route.MetaArgs) {
  if (!d) return buildMeta({ title: "Not found", path: location.pathname, noindex: true });
  return buildMeta({
    title: `${d.coin.symbol} to ${d.country.currency}: ${d.coin.name} price in ${d.country.currencyName} today`,
    description: `Convert ${d.coin.name} to ${d.country.currencyName} at the live rate, compare P2P prices in ${d.country.name}, and see how locals buy ${d.coin.symbol}.`,
    path: `/markets/${d.coin.id}/to/${d.country.currency.toLowerCase()}`,
    jsonLd: d.jsonLd,
  });
}

export default function ConverterPage({ loaderData }: Route.ComponentProps) {
  const { coin, country, quote, officialRate, p2p, coinTable, fiatTable, howToBuyHtml, regulationUpdatedAt, crumbs, sample } = loaderData;
  const money = (n: number) => formatPrice(n, country.currency, country.locale);
  return (
    <div className="container-content space-y-8 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <SampleDataNotice show={sample} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          {coin.name} to {country.currencyName} ({coin.symbol} to {country.currency})
        </h1>
        <p className="text-lg">
          1 {coin.symbol} = <strong className="tabular" data-testid="converter-rate">{money(quote.price)}</strong>{" "}
          <PriceChip quote={quote} locale={country.locale} />
        </p>
      </header>

      <Converter symbol={coin.symbol} currency={country.currency} price={quote.price} locale={country.locale} />

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="coin-to-fiat" className="space-y-2">
          <h2 id="coin-to-fiat" className="text-lg font-semibold">{coin.symbol} to {country.currency}</h2>
          <table className="tabular w-full text-sm">
            <tbody>
              {coinTable.map((r) => (
                <tr key={r.amount} className="border-b border-border">
                  <td className="py-2">{formatAmount(r.amount, country.locale)} {coin.symbol}</td>
                  <td className="py-2 text-right font-semibold">{money(r.fiat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section aria-labelledby="fiat-to-coin" className="space-y-2">
          <h2 id="fiat-to-coin" className="text-lg font-semibold">{country.currency} to {coin.symbol}</h2>
          <table className="tabular w-full text-sm">
            <tbody>
              {fiatTable.map((r) => (
                <tr key={r.amount} className="border-b border-border">
                  <td className="py-2">{money(r.amount)}</td>
                  <td className="py-2 text-right font-semibold">{formatAmount(r.coin, country.locale)} {coin.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section aria-labelledby="p2p" className="space-y-2 rounded-brand border border-border bg-surface p-4" data-testid="p2p-comparison">
        <h2 id="p2p" className="text-lg font-semibold">P2P vs official rate in {country.name}</h2>
        <p className="text-sm">
          Official rate: <strong className="tabular">1 USD = {money(officialRate)}</strong>
        </p>
        {p2p ? (
          <>
            <p className="text-sm">
              P2P USDT: buy <strong className="tabular">{money(p2p.buy)}</strong>, sell <strong className="tabular">{money(p2p.sell)}</strong>{" "}
              ({p2p.premiumPct >= 0 ? "+" : ""}
              {p2p.premiumPct.toFixed(1)}% vs official)
            </p>
            <p className="text-sm">
              Buying {coin.symbol} with USDT bought on P2P works out at about <strong className="tabular">{money(p2p.coinViaP2p)}</strong>.
            </p>
            <p className="text-xs text-muted">
              Source: {p2p.source}, updated {new Date(p2p.capturedAt).toUTCString()}.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">No P2P rate recorded for {country.name} yet.</p>
        )}
      </section>

      <section aria-labelledby="how-to-buy" className="space-y-2">
        <h2 id="how-to-buy" className="text-lg font-semibold">How people in {country.name} buy {coin.symbol}</h2>
        <BodyHtml html={howToBuyHtml} />
        <p className="text-sm">
          Rules and tax: see the <Link to={`/local/${country.code}`} className="underline">{country.name} hub</Link>
          {regulationUpdatedAt ? ` (regulation last reviewed ${regulationUpdatedAt})` : ""}.
        </p>
      </section>

      <p className="text-xs text-muted">Rates are indicative and change every minute. Not financial advice.</p>
      <NewsletterBox variant="page" country={country.code} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound message="We don't have a converter for that pair." />;
  throw error;
}
