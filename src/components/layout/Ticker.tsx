import { Link } from "react-router";
import { useLiveQuote } from "~/lib/market/live";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import type { LocalQuote } from "~/lib/market/types";
import { cn } from "~/lib/utils";

interface Props {
  quotes: readonly LocalQuote[];
  locale: string;
  sample?: boolean;
}

function TickerItem({ quote, locale }: { quote: LocalQuote; locale: string }) {
  const q = useLiveQuote(quote);
  const dir = changeDirection(q.change24h);
  return (
    <li>
      <Link to={`/markets/${q.id}`} className="inline-flex gap-1.5 hover:text-signal-ink">
        <span className="font-semibold">{q.symbol}</span>
        <span>{formatPrice(q.price, q.currency, locale)}</span>
        <span className={cn(dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-muted")}>{formatChange(q.change24h, locale)}</span>
      </Link>
    </li>
  );
}

/** Thin top bar: top 10 coins in local currency, refreshed every 60 s. Scrolls horizontally (no animation, no CLS). */
export function Ticker({ quotes, locale, sample = false }: Props) {
  return (
    <div className="border-b border-border bg-surface" data-testid="ticker">
      <ul
        className="container-content tabular flex h-8 items-center gap-5 overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none]"
        aria-label="Top 10 coin prices"
      >
        {quotes.map((q) => (
          <TickerItem key={q.id} quote={q} locale={locale} />
        ))}
        {sample ? (
          <li className="text-muted">
            <Link to="/markets" className="underline">Sample prices</Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
