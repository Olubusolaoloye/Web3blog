/** Rounds to a "nice" number (1, 2, 5 × 10^n) for conversion tables. */
export function niceRound(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const f = value / base;
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return nice * base;
}

/** Fiat amounts worth roughly $10, $50, $100, $500 and $1,000 in the local currency. */
export function fiatSteps(usdRate: number): number[] {
  return [...new Set([10, 50, 100, 500, 1000].map((usd) => niceRound(usd * usdRate)))];
}

/** Coin amounts that make sense for the coin's price (fractions for BTC, whole units for stablecoins). */
export function coinSteps(priceUsd: number): number[] {
  if (priceUsd >= 1000) return [0.0001, 0.001, 0.01, 0.1, 0.5, 1];
  if (priceUsd >= 10) return [0.01, 0.1, 1, 5, 10, 100];
  return [1, 10, 50, 100, 500, 1000];
}

export function formatAmount(n: number, locale = "en", maxFraction = 8): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: n < 1 ? maxFraction : n < 100 ? 4 : 2 }).format(n);
}
