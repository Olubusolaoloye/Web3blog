import { launchedCountries } from "~/config/countries";
import { CoinGeckoProvider } from "./coingecko.server";
import { MemoryStore, SwrCache, TTL, UpstashStore, UpstreamLimiter, type CacheStore } from "./cache";
import { fxRate, toLocalQuote, usdTo } from "./convert";
import { fixtureFxProvider, fixtureMarketProvider } from "./fixtures";
import { ExchangeRateApiProvider } from "./fx.server";
import type { ChartRange, CoinDetail, CoinMarket, CoinRow, FxProvider, FxRates, LocalQuote, MarketProvider, PricePoint } from "./types";

/** USD plus every launched country's currency. */
export const SUPPORTED_CURRENCIES = ["USD", ...launchedCountries.map((c) => c.currency)] as const;
export const isSupportedCurrency = (c: string): boolean => (SUPPORTED_CURRENCIES as readonly string[]).includes(c);

export interface MarketServices {
  provider: MarketProvider;
  fx: FxProvider;
  cache: SwrCache;
  /** True when showing sample data (no CoinGecko key). */
  sample: boolean;
}

export function createMarketServices(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): MarketServices {
  const key = env.COINGECKO_API_KEY;
  const live = (env.MARKET_DATA_SOURCE ?? (key ? "live" : "fixtures")) === "live" && Boolean(key);
  const store: CacheStore =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN, fetchImpl)
      : new MemoryStore();
  // Demo plan allows 30 calls/min; stay under it per instance. Override with COINGECKO_MAX_CALLS_PER_MIN.
  const limiter = new UpstreamLimiter(Number(env.COINGECKO_MAX_CALLS_PER_MIN ?? 25));
  return {
    provider: live ? new CoinGeckoProvider(key as string, env.COINGECKO_API_TIER === "pro" ? "pro" : "demo", fetchImpl) : fixtureMarketProvider,
    fx: live ? new ExchangeRateApiProvider(env.FX_API_KEY || undefined, fetchImpl) : fixtureFxProvider,
    cache: new SwrCache(store, limiter),
    sample: !live,
  };
}

let services: MarketServices | undefined;
export function getMarketServices(): MarketServices {
  services ??= createMarketServices();
  return services;
}

/** Market data API used by loaders and /api/prices. Every upstream call goes through the cache. */
export class MarketService {
  constructor(private readonly s: MarketServices = getMarketServices()) {}

  get sample(): boolean {
    return this.s.sample;
  }

  async topCoins(): Promise<CoinMarket[]> {
    return (await this.s.cache.get(`market:${this.s.provider.name}:top250`, TTL.prices, () => this.s.provider.getTopCoins())).value;
  }

  async fxRates(): Promise<FxRates> {
    return (await this.s.cache.get(`fx:${this.s.fx.name}:usd`, TTL.fx, () => this.s.fx.getRates())).value;
  }

  async quotes(currency: string, ids?: readonly string[], sparkPoints = 24): Promise<LocalQuote[]> {
    const [coins, fx] = await Promise.all([this.topCoins(), this.fxRates()]);
    const list = ids ? ids.map((id) => coins.find((c) => c.id === id)).filter((c): c is CoinMarket => Boolean(c)) : coins.slice(0, 10);
    return list.map((c) => toLocalQuote(c, currency, fx, sparkPoints));
  }

  async table(
    currency: string,
    opts: { sort?: SortKey; dir?: "asc" | "desc"; page?: number; perPage?: number; limit?: number } = {},
  ): Promise<{ rows: CoinRow[]; total: number; page: number; totalPages: number }> {
    const { sort = "rank", dir = sort === "rank" ? "asc" : "desc", perPage = 50, limit = 200 } = opts;
    const [coins, fx] = await Promise.all([this.topCoins(), this.fxRates()]);
    const rate = fxRate(fx, currency);
    const top = coins.slice(0, limit);
    const value = (c: CoinMarket): number =>
      sort === "price" ? c.priceUsd : sort === "change24h" ? c.change24h : sort === "change7d" ? (c.change7d ?? -Infinity) : sort === "marketCap" ? c.marketCapUsd : c.rank;
    const sorted = [...top].sort((a, b) => (dir === "asc" ? value(a) - value(b) : value(b) - value(a)));
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const page = Math.min(Math.max(1, opts.page ?? 1), totalPages);
    const rows = sorted.slice((page - 1) * perPage, page * perPage).map((c) => ({
      ...toLocalQuote(c, currency, fx, 28),
      rank: c.rank,
      image: c.image,
      change7d: c.change7d,
      marketCap: c.marketCapUsd * rate,
      volume: c.volumeUsd * rate,
    }));
    return { rows, total: sorted.length, page, totalPages };
  }

  async coin(id: string): Promise<{ market: CoinMarket | undefined; detail: CoinDetail | null }> {
    const [coins, detail] = await Promise.all([
      this.topCoins(),
      // Metadata is optional: if it can't be fetched (rate limit, outage) the page renders without it.
      this.s.cache
        .get(`coin:${this.s.provider.name}:${id}`, TTL.coinDetail, () => this.s.provider.getCoinDetail(id))
        .then((r) => r.value)
        .catch((error: unknown) => {
          console.error("[market] coin detail unavailable", id, error);
          return null;
        }),
    ]);
    return { market: coins.find((c) => c.id === id), detail };
  }

  async chart(id: string, range: ChartRange, currency: string): Promise<PricePoint[]> {
    const policy = range === "1d" ? TTL.chartShort : TTL.chartLong;
    const [points, fx] = await Promise.all([
      // Charts are optional too: an empty series renders "No chart data" instead of failing the page.
      this.s.cache
        .get(`chart:${this.s.provider.name}:${id}:${range}`, policy, () => this.s.provider.getChart(id, range))
        .then((r) => r.value)
        .catch((error: unknown): PricePoint[] => {
          console.error("[market] chart unavailable", id, range, error);
          return [];
        }),
      this.fxRates(),
    ]);
    const rate = fxRate(fx, currency);
    return points.map(([t, p]) => [t, p * rate]);
  }

  /** Price of one coin in every supported currency. */
  async priceInAll(priceUsd: number): Promise<Array<{ currency: string; price: number }>> {
    const fx = await this.fxRates();
    return SUPPORTED_CURRENCIES.map((currency) => ({ currency, price: usdTo(priceUsd, currency, fx) }));
  }
}

export const sortKeys = ["rank", "price", "change24h", "change7d", "marketCap"] as const;
export type SortKey = (typeof sortKeys)[number];

/** Loader helper: quotes for the layout/article, but never let a market outage break the page. */
export async function safeQuotes(currency: string, ids?: readonly string[]): Promise<LocalQuote[]> {
  try {
    return await new MarketService().quotes(currency, ids);
  } catch (error) {
    console.error("[market] quotes unavailable", error);
    return [];
  }
}
