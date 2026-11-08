/** A coin's market data in USD, as returned by the market provider. */
export interface CoinMarket {
  /** CoinGecko id, e.g. "bitcoin" */
  id: string;
  symbol: string;
  name: string;
  image?: string;
  rank: number;
  priceUsd: number;
  change24h: number;
  change7d: number | null;
  marketCapUsd: number;
  volumeUsd: number;
  /** 7-day hourly prices in USD (CoinGecko sparkline). */
  sparkline7d: number[];
}

/** What UI components receive: price converted to one local currency. */
export interface LocalQuote {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change24h: number;
  /** Small downsampled 7-day series (local currency) for mini charts. */
  spark?: number[];
}

export interface CoinRow extends LocalQuote {
  rank: number;
  image?: string;
  change7d: number | null;
  marketCap: number;
  volume: number;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  rank: number | null;
  description: string;
  homepage?: string;
  /** Chain → contract address (empty for native coins like BTC). */
  platforms: Record<string, string>;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  athUsd: number | null;
  athDate: string | null;
}

export const chartRanges = ["1d", "7d", "1m", "1y"] as const;
export type ChartRange = (typeof chartRanges)[number];

/** [timestamp ms, price] pairs */
export type PricePoint = [number, number];

export type FxRates = Readonly<Record<string, number>>;

export interface MarketProvider {
  readonly name: "coingecko" | "fixtures";
  /** Top coins by market cap (up to 250), in USD. */
  getTopCoins(): Promise<CoinMarket[]>;
  getCoinDetail(id: string): Promise<CoinDetail | null>;
  getChart(id: string, range: ChartRange): Promise<PricePoint[]>;
}

export interface FxProvider {
  readonly name: string;
  /** USD → currency rates. */
  getRates(): Promise<FxRates>;
}
