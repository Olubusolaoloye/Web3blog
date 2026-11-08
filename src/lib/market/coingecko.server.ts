import { z } from "zod";
import type { ChartRange, CoinDetail, CoinMarket, MarketProvider, PricePoint } from "./types";

/**
 * CoinGecko adapter (server only). Demo and Pro plans differ in host and header:
 * demo → api.coingecko.com + x-cg-demo-api-key, pro → pro-api.coingecko.com + x-cg-pro-api-key.
 * Responses are validated with Zod so a shape change fails loudly instead of rendering garbage.
 */
const marketSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  market_cap_rank: z.number().nullish(),
  current_price: z.number().nullish(),
  market_cap: z.number().nullish(),
  total_volume: z.number().nullish(),
  price_change_percentage_24h: z.number().nullish(),
  price_change_percentage_7d_in_currency: z.number().nullish(),
  sparkline_in_7d: z.object({ price: z.array(z.number().nullable()) }).nullish(),
});

const detailSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.object({ large: z.string().nullish() }).partial().nullish(),
  market_cap_rank: z.number().nullish(),
  description: z.object({ en: z.string().nullish() }).partial().nullish(),
  links: z.object({ homepage: z.array(z.string()).nullish() }).partial().nullish(),
  platforms: z.record(z.string(), z.string().nullable()).nullish(),
  market_data: z
    .object({
      circulating_supply: z.number().nullish(),
      total_supply: z.number().nullish(),
      max_supply: z.number().nullish(),
      ath: z.record(z.string(), z.number()).nullish(),
      ath_date: z.record(z.string(), z.string()).nullish(),
    })
    .partial()
    .nullish(),
});

const chartSchema = z.object({ prices: z.array(z.tuple([z.number(), z.number()])) });

export const RANGE_DAYS: Record<ChartRange, string> = { "1d": "1", "7d": "7", "1m": "30", "1y": "365" };

/** CoinGecko descriptions are HTML; keep the first two paragraphs as plain text. */
export function plainDescription(html: string | null | undefined): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "");
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n");
}

export function mapMarket(raw: unknown): CoinMarket[] {
  return z
    .array(marketSchema)
    .parse(raw)
    .filter((c) => typeof c.current_price === "number")
    .map((c, i) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image ?? undefined,
      rank: c.market_cap_rank ?? i + 1,
      priceUsd: c.current_price as number,
      change24h: c.price_change_percentage_24h ?? 0,
      change7d: c.price_change_percentage_7d_in_currency ?? null,
      marketCapUsd: c.market_cap ?? 0,
      volumeUsd: c.total_volume ?? 0,
      sparkline7d: (c.sparkline_in_7d?.price ?? []).filter((p): p is number => typeof p === "number"),
    }));
}

export function mapDetail(raw: unknown): CoinDetail {
  const d = detailSchema.parse(raw);
  const platforms = Object.fromEntries(
    Object.entries(d.platforms ?? {}).filter((e): e is [string, string] => Boolean(e[0]) && Boolean(e[1])),
  );
  return {
    id: d.id,
    symbol: d.symbol.toUpperCase(),
    name: d.name,
    image: d.image?.large ?? undefined,
    rank: d.market_cap_rank ?? null,
    description: plainDescription(d.description?.en),
    homepage: d.links?.homepage?.find((u) => /^https?:\/\//.test(u)),
    platforms,
    circulatingSupply: d.market_data?.circulating_supply ?? null,
    totalSupply: d.market_data?.total_supply ?? null,
    maxSupply: d.market_data?.max_supply ?? null,
    athUsd: d.market_data?.ath?.usd ?? null,
    athDate: d.market_data?.ath_date?.usd ?? null,
  };
}

export function mapChart(raw: unknown): PricePoint[] {
  return chartSchema.parse(raw).prices;
}

export class CoinGeckoProvider implements MarketProvider {
  readonly name = "coingecko" as const;
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(
    apiKey: string,
    tier: "demo" | "pro" = "demo",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.base = tier === "pro" ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
    this.headers = { accept: "application/json", [tier === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key"]: apiKey };
  }

  private async get(path: string): Promise<unknown> {
    const res = await this.fetchImpl(`${this.base}${path}`, { headers: this.headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`CoinGecko ${res.status} for ${path.split("?")[0]}`);
    return res.json();
  }

  async getTopCoins(): Promise<CoinMarket[]> {
    const raw = await this.get(
      "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h%2C7d",
    );
    return mapMarket(raw ?? []);
  }

  async getCoinDetail(id: string): Promise<CoinDetail | null> {
    const raw = await this.get(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    );
    return raw ? mapDetail(raw) : null;
  }

  async getChart(id: string, range: ChartRange): Promise<PricePoint[]> {
    const raw = await this.get(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${RANGE_DAYS[range]}`);
    return raw ? mapChart(raw) : [];
  }
}
