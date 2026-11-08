import { Link } from "react-router";
import type { Route } from "./+types/_site.markets._index";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { StickyNewsletter } from "~/components/capture/StickyNewsletter";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Pagination } from "~/components/layout/Pagination";
import { SampleDataNotice } from "~/components/market/SampleDataNotice";
import { Sparkline } from "~/components/market/Sparkline";
import { resolveCountry } from "~/lib/country.server";
import { publicPageHeaders } from "~/lib/http/cache";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import { MarketService, sortKeys, type SortKey } from "~/lib/market/service.server";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";
import { cn } from "~/lib/utils";

const PER_PAGE = 50;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort") ?? "rank";
  const sort: SortKey = (sortKeys as readonly string[]).includes(sortParam) ? (sortParam as SortKey) : "rank";
  const dirParam = url.searchParams.get("dir");
  const dir = dirParam === "asc" || dirParam === "desc" ? dirParam : sort === "rank" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const country = await resolveCountry(request);
  const service = new MarketService();
  const table = await service.table(country.currency, { sort, dir, page, perPage: PER_PAGE, limit: 200 });
  return { ...table, sort, dir, currency: country.currency, locale: country.locale, countryCode: country.code, sample: service.sample };
}

export const headers: Route.HeadersFunction = publicPageHeaders;

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Markets", path: "/markets" },
];

export function meta({ data: d }: Route.MetaArgs) {
  return buildMeta({
    title: "Crypto prices today in your currency",
    description: "Live prices for the top 200 cryptocurrencies in naira, shillings, rand and cedis, with 24h and 7-day changes.",
    path: "/markets",
    noindex: (d?.page ?? 1) > 1 || (d?.sort ?? "rank") !== "rank",
    jsonLd: graph(breadcrumbJsonLd(crumbs)),
  });
}

const columns: { key: SortKey; label: string; className?: string }[] = [
  { key: "rank", label: "#" },
  { key: "price", label: "Price", className: "text-right" },
  { key: "change24h", label: "24h", className: "text-right" },
  { key: "change7d", label: "7d", className: "hidden text-right sm:table-cell" },
  { key: "marketCap", label: "Market cap", className: "hidden text-right md:table-cell" },
];

export default function Markets({ loaderData }: Route.ComponentProps) {
  const { rows, page, totalPages, sort, dir, currency, locale, countryCode, sample, total } = loaderData;
  const href = (p: { sort?: SortKey; dir?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const s = p.sort ?? sort;
    const d = p.dir ?? dir;
    if (s !== "rank") sp.set("sort", s);
    if (s !== "rank" || d !== "asc") sp.set("dir", d);
    if ((p.page ?? 1) > 1) sp.set("page", String(p.page));
    const q = sp.toString();
    return q ? `/markets?${q}` : "/markets";
  };
  const sortLink = (key: SortKey) => {
    const nextDir = sort === key ? (dir === "asc" ? "desc" : "asc") : key === "rank" ? "asc" : "desc";
    return href({ sort: key, dir: nextDir });
  };
  const ariaSort = (key: SortKey) => (sort === key ? (dir === "asc" ? "ascending" : "descending") : undefined);
  const pct = (n: number | null) => {
    if (n === null) return <span className="text-muted">–</span>;
    const d = changeDirection(n);
    return <span className={d === "up" ? "text-up" : d === "down" ? "text-down" : "text-muted"}>{formatChange(n, locale)}</span>;
  };

  return (
    <div className="container-content space-y-6 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Crypto prices in {currency}</h1>
        <p className="text-muted">
          Top {total} coins by market cap. Change your currency with the selector at the top. Not financial advice.
        </p>
      </header>
      <SampleDataNotice show={sample} />

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm" data-testid="markets-table">
          <caption className="sr-only">Cryptocurrency prices in {currency}, sorted by {sort}</caption>
          <thead className="bg-surface text-left text-muted">
            <tr>
              {columns.slice(0, 1).map((c) => (
                <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className="px-3 py-2">
                  <Link to={sortLink(c.key)} preventScrollReset>{c.label}</Link>
                </th>
              ))}
              <th scope="col" className="px-3 py-2">Coin</th>
              {columns.slice(1).map((c) => (
                <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className={cn("px-3 py-2", c.className)}>
                  <Link to={sortLink(c.key)} preventScrollReset className={cn(sort === c.key && "font-semibold text-text")}>
                    {c.label}
                    {sort === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
                  </Link>
                </th>
              ))}
              <th scope="col" className="hidden px-3 py-2 text-right lg:table-cell">Last 7 days</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface">
                <td className="px-3 py-2 text-muted">{r.rank}</td>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <Link to={`/markets/${r.id}`} className="font-sans hover:text-signal-ink">
                    <span className="font-semibold">{r.name}</span> <span className="text-muted">{r.symbol}</span>
                  </Link>
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatPrice(r.price, currency, locale)}</td>
                <td className="px-3 py-2 text-right">{pct(r.change24h)}</td>
                <td className="hidden px-3 py-2 text-right sm:table-cell">{pct(r.change7d)}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right md:table-cell">{formatPrice(r.marketCap, currency, locale)}</td>
                <td className="hidden px-3 py-2 lg:table-cell">
                  {r.spark ? <Sparkline values={r.spark} className="ml-auto" label={`${r.name} 7-day trend`} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => href({ page: p })} prevLabel="← Previous" nextLabel="Next →" />
      <NewsletterBox variant="page" country={countryCode} heading="Get prices and scam alerts in your inbox" />
      <StickyNewsletter country={countryCode} />
    </div>
  );
}
