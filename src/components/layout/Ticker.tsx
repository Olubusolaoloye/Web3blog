import { Link } from "react-router";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import type { LocalQuote } from "~/lib/market/types";
import { cn } from "~/lib/utils";

interface Props {
  quotes: readonly LocalQuote[];
  locale: string;
}

/** Thin top bar: top 10 coins in local currency. Scrolls horizontally on small screens (no animation, no CLS). */
export function Ticker({ quotes, locale }: Props) {
  return (
    <div className="border-b border-border bg-surface" data-testid="ticker">
      <ul
        className="container-content tabular flex h-8 items-center gap-5 overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none]"
        aria-label="Top 10 coin prices"
      >
        {quotes.map((q) => {
          const dir = changeDirection(q.change24h);
          return (
            <li key={q.id}>
              <Link to={`/markets/${q.id}`} className="inline-flex gap-1.5 hover:text-signal-ink">
                <span className="font-semibold">{q.symbol}</span>
                <span>{formatPrice(q.price, q.currency, locale)}</span>
                <span className={cn(dir === "up" && "text-up", dir === "down" && "text-down", dir === "flat" && "text-muted")}>
                  {formatChange(q.change24h, locale)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
