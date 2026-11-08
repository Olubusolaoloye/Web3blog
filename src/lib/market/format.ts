/**
 * Price formatting for chips, tickers and tables. Locale-aware (see docs/decisions.md #10).
 * Large values use compact notation (₦98.2M); sub-unit values keep enough precision to be useful.
 */
export function formatPrice(value: number, currency: string, locale: string): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    // minimumFractionDigits must be explicit: Node's ICU and Chrome's disagree on the default for compact
    // currency ("₦2.0M" vs "₦2M"), which caused hydration mismatches.
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  }
  const maximumFractionDigits = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  }).format(value);
}

export function formatChange(change: number, locale = "en"): string {
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "•";
  const pct = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(
    Math.abs(change),
  );
  return `${arrow}${pct}%`;
}

export function changeDirection(change: number): "up" | "down" | "flat" {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}
