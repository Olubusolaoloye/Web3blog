import type { CoinQuote, LocalQuote } from "./types";

/**
 * Mocked market data for Phase 1/2 (CLAUDE.md §10: "Ticker (mocked data OK)").
 * Replaced by the CoinGecko + FX adapters in Phase 3; the function signatures stay the same.
 */
export const MOCK_QUOTES: readonly CoinQuote[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", priceUsd: 64250, change24h: 2.1 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", priceUsd: 3120, change24h: -0.8 },
  { id: "tether", symbol: "USDT", name: "Tether", priceUsd: 1, change24h: 0.01 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", priceUsd: 585, change24h: 1.2 },
  { id: "solana", symbol: "SOL", name: "Solana", priceUsd: 148, change24h: 4.6 },
  { id: "usd-coin", symbol: "USDC", name: "USDC", priceUsd: 1, change24h: 0 },
  { id: "ripple", symbol: "XRP", name: "XRP", priceUsd: 0.52, change24h: -1.9 },
  { id: "toncoin", symbol: "TON", name: "Toncoin", priceUsd: 5.4, change24h: 0.7 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", priceUsd: 0.12, change24h: -3.2 },
  { id: "tron", symbol: "TRX", name: "TRON", priceUsd: 0.13, change24h: 0.4 },
];

/** USD → local fiat. Mocked; Phase 3 reads these from the FX adapter. */
export const MOCK_FX: Readonly<Record<string, number>> = {
  USD: 1,
  NGN: 1530,
  KES: 129,
  ZAR: 18.1,
  GHS: 15.6,
  INR: 84,
  PHP: 57,
};

export function convertUsd(amountUsd: number, currency: string, fx = MOCK_FX): number {
  const rate = fx[currency];
  if (rate === undefined) throw new Error(`No FX rate for ${currency}`);
  return amountUsd * rate;
}

export function getMockQuotes(currency: string, ids?: readonly string[]): LocalQuote[] {
  const list = ids ? MOCK_QUOTES.filter((q) => ids.includes(q.id)) : MOCK_QUOTES;
  return list.map((q) => ({ ...q, currency, price: convertUsd(q.priceUsd, currency) }));
}

export interface P2pRate {
  countryCode: string;
  asset: string;
  fiat: string;
  buy: number;
  sell: number;
  source: string;
  capturedAt: string;
}

/** Mocked USDT P2P rates per launch country. Phase 3 reads `p2p_rates` (manual entry from admin first). */
export function getMockP2pRate(countryCode: string, currency: string): P2pRate | undefined {
  const fx = MOCK_FX[currency];
  if (fx === undefined) return undefined;
  return {
    countryCode,
    asset: "USDT",
    fiat: currency,
    buy: fx * 1.012,
    sell: fx * 0.998,
    source: "Sample data",
    capturedAt: "2026-11-08T08:00:00Z",
  };
}
