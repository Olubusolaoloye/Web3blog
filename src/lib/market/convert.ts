import type { CoinMarket, FxRates, LocalQuote } from "./types";

/** Supported display currencies: USD plus every launched country's currency. */
export function fxRate(fx: FxRates, currency: string): number {
  if (currency === "USD") return 1;
  const rate = fx[currency];
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) throw new Error(`No FX rate for ${currency}`);
  return rate;
}

export function usdTo(amountUsd: number, currency: string, fx: FxRates): number {
  return amountUsd * fxRate(fx, currency);
}

/** Coin amount → local fiat. */
export function coinToFiat(amount: number, priceUsd: number, currency: string, fx: FxRates): number {
  return amount * usdTo(priceUsd, currency, fx);
}

/** Local fiat → coin amount. */
export function fiatToCoin(fiat: number, priceUsd: number, currency: string, fx: FxRates): number {
  const local = usdTo(priceUsd, currency, fx);
  return local === 0 ? 0 : fiat / local;
}

/**
 * P2P premium: how much more a P2P USDT seller charges than the official FX rate, in percent.
 * Positive = local currency trades weaker on P2P than the official rate.
 */
export function p2pPremiumPct(p2pRate: number, officialRate: number): number {
  return officialRate > 0 ? ((p2pRate - officialRate) / officialRate) * 100 : 0;
}

/** Evenly samples a series down to `points` values (keeps first and last). */
export function downsample(values: readonly number[], points: number): number[] {
  if (values.length <= points) return [...values];
  if (points < 2) return values.length ? [values[values.length - 1] as number] : [];
  const out: number[] = [];
  const step = (values.length - 1) / (points - 1);
  for (let i = 0; i < points; i++) out.push(values[Math.round(i * step)] as number);
  return out;
}

export function toLocalQuote(coin: CoinMarket, currency: string, fx: FxRates, sparkPoints = 24): LocalQuote {
  const rate = fxRate(fx, currency);
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    currency,
    price: coin.priceUsd * rate,
    change24h: coin.change24h,
    // 5 significant digits is plenty for a 140px chart and keeps /api/prices responses small.
    spark: downsample(coin.sparkline7d, sparkPoints).map((v) => Number((v * rate).toPrecision(5))),
  };
}
