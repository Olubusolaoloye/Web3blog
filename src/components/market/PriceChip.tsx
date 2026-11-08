import { Link } from "react-router";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import type { LocalQuote } from "~/lib/market/types";
import { cn } from "~/lib/utils";

interface Props {
  quote: LocalQuote;
  locale: string;
}

/**
 * Inline chip: `BTC ₦98.2M ▲2.1%` in the visitor's currency.
 * Phase 1 renders server-side only; periodic client refresh and the mini chart arrive in Phase 3.
 */
export function PriceChip({ quote, locale }: Props) {
  const dir = changeDirection(quote.change24h);
  return (
    <Link
      to={`/markets/${quote.id}`}
      className="tabular inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 align-middle text-sm no-underline hover:border-signal-ink"
      data-testid="price-chip"
      aria-label={`${quote.name} price ${formatPrice(quote.price, quote.currency, locale)}, ${formatChange(quote.change24h, locale)} in 24 hours`}
    >
      <span className="font-semibold">{quote.symbol}</span>
      <span>{formatPrice(quote.price, quote.currency, locale)}</span>
      <span className={cn(dir === "up" && "text-up", dir === "down" && "text-down", dir === "flat" && "text-muted")}>
        {formatChange(quote.change24h, locale)}
      </span>
    </Link>
  );
}
