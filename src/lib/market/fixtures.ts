import type { ChartRange, CoinDetail, CoinMarket, FxProvider, FxRates, MarketProvider, PricePoint } from "./types";

/**
 * Deterministic sample market data, used when no CoinGecko key is configured (local dev, tests, previews).
 * The UI labels it "Sample data". The first ten coins use real names; the rest are generated placeholders.
 */
const BASE: Array<[id: string, symbol: string, name: string, priceUsd: number, change24h: number, change7d: number, capUsd: number]> = [
  ["bitcoin", "BTC", "Bitcoin", 64250, 2.1, 4.8, 1.27e12],
  ["ethereum", "ETH", "Ethereum", 3120, -0.8, 1.9, 3.75e11],
  ["tether", "USDT", "Tether", 1, 0.01, 0.02, 1.2e11],
  ["binancecoin", "BNB", "BNB", 585, 1.2, -2.4, 8.5e10],
  ["solana", "SOL", "Solana", 148, 4.6, 9.1, 6.9e10],
  ["usd-coin", "USDC", "USDC", 1, 0, 0.01, 3.5e10],
  ["ripple", "XRP", "XRP", 0.52, -1.9, -4.2, 2.9e10],
  ["toncoin", "TON", "Toncoin", 5.4, 0.7, 3.3, 1.35e10],
  ["dogecoin", "DOGE", "Dogecoin", 0.12, -3.2, -6.5, 1.7e10],
  ["tron", "TRX", "TRON", 0.13, 0.4, 1.1, 1.15e10],
];

export const FIXTURE_COIN_COUNT = 200;

/** Small deterministic PRNG so fixtures are stable across runs. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function series(endPrice: number, changePct: number, points: number, seed: number): number[] {
  const rand = seeded(seed);
  const start = endPrice / (1 + changePct / 100);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const noise = (rand() - 0.5) * 0.02 * endPrice;
    out.push(start + (endPrice - start) * t + (i === points - 1 ? 0 : noise));
  }
  out[points - 1] = endPrice;
  return out;
}

function buildCoins(): CoinMarket[] {
  const coins: CoinMarket[] = BASE.map(([id, symbol, name, priceUsd, change24h, change7d, cap], i) => ({
    id, symbol, name, rank: i + 1, priceUsd, change24h, change7d,
    marketCapUsd: cap, volumeUsd: cap * 0.04, sparkline7d: series(priceUsd, change7d, 168, i + 1),
  }));
  const rand = seeded(42);
  for (let i = coins.length; i < FIXTURE_COIN_COUNT; i++) {
    const n = i + 1;
    const cap = 1.1e10 * Math.pow(0.975, i - 9);
    const price = Number((0.05 + rand() * 40).toFixed(4));
    const change24h = Number(((rand() - 0.5) * 12).toFixed(2));
    const change7d = Number(((rand() - 0.5) * 30).toFixed(2));
    coins.push({
      id: `sample-coin-${n}`,
      symbol: `SMP${n}`,
      name: `Sample Coin ${n}`,
      rank: n,
      priceUsd: price,
      change24h,
      change7d,
      marketCapUsd: cap,
      volumeUsd: cap * (0.01 + rand() * 0.1),
      sparkline7d: series(price, change7d, 168, n),
    });
  }
  return coins;
}

export const FIXTURE_COINS: readonly CoinMarket[] = buildCoins();

/** USD → local fiat, sample values. */
export const FIXTURE_FX: FxRates = { USD: 1, NGN: 1530, KES: 129, ZAR: 18.1, GHS: 15.6, INR: 84, PHP: 57 };

const CONTRACTS: Record<string, Record<string, string>> = {
  tether: { ethereum: "0xdac17f958d2ee523a2206206994597c13d831ec7", tron: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  "usd-coin": { ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
};

export const fixtureMarketProvider: MarketProvider = {
  name: "fixtures",
  async getTopCoins() {
    return FIXTURE_COINS.map((c) => ({ ...c }));
  },
  async getCoinDetail(id) {
    const c = FIXTURE_COINS.find((x) => x.id === id);
    if (!c) return null;
    const detail: CoinDetail = {
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      rank: c.rank,
      description: `${c.name} (${c.symbol}) is shown here with sample data. Connect a CoinGecko API key to see live prices and the project's own description.`,
      platforms: CONTRACTS[c.id] ?? {},
      circulatingSupply: c.marketCapUsd / c.priceUsd,
      totalSupply: c.marketCapUsd / c.priceUsd,
      maxSupply: c.id === "bitcoin" ? 21_000_000 : null,
      athUsd: c.priceUsd * 1.18,
      athDate: "2026-03-14T00:00:00Z",
    };
    return detail;
  },
  async getChart(id: string, range: ChartRange): Promise<PricePoint[]> {
    const c = FIXTURE_COINS.find((x) => x.id === id);
    if (!c) return [];
    const spec = { "1d": [288, 5 * 60_000, c.change24h], "7d": [168, 3_600_000, c.change7d ?? 0], "1m": [180, 4 * 3_600_000, (c.change7d ?? 0) * 2], "1y": [365, 86_400_000, (c.change7d ?? 0) * 6] }[range];
    const [points, stepMs, change] = spec as [number, number, number];
    const end = Date.UTC(2026, 10, 8, 12);
    return series(c.priceUsd, change, points, c.rank * 7 + points).map((p, i) => [end - (points - 1 - i) * stepMs, p]);
  },
};

export const fixtureFxProvider: FxProvider = {
  name: "fixtures",
  async getRates() {
    return FIXTURE_FX;
  },
};
