import { useRef, useState } from "react";
import { Link } from "react-router";
import { useLiveQuote } from "~/lib/market/live";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import type { LocalQuote } from "~/lib/market/types";
import { cn } from "~/lib/utils";
import { Sparkline } from "./Sparkline";

interface Props {
  quote: LocalQuote;
  locale: string;
  /** Live refresh via /api/prices (default on). Off for static HTML such as server-rendered article bodies. */
  live?: boolean;
}

/**
 * Inline chip: `BTC ₦98.2M ▲2.1%` in the visitor's currency (CLAUDE.md §4).
 * Hover or keyboard focus shows a 7-day mini chart (CSS only, works without JS). On touch screens the first tap
 * opens the chart and a second tap follows the link.
 */
export function PriceChip({ quote, locale, live = true }: Props) {
  const q = useLiveQuote(quote, live);
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>("mouse");
  const dir = changeDirection(q.change24h);
  const price = formatPrice(q.price, q.currency, locale);
  const change = formatChange(q.change24h, locale);

  return (
    <span
      className="group relative inline-block align-middle"
      // Touch browsers fire a synthetic mouseleave right after a tap; only real mouse leaves close the chart.
      onMouseLeave={() => {
        if (pointer.current !== "touch") setOpen(false);
      }}
    >
      <Link
        to={`/markets/${q.id}`}
        className="tabular inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-sm no-underline hover:border-signal-ink"
        data-testid="price-chip"
        aria-label={`${q.name} price ${price}, ${change} in 24 hours`}
        onPointerDown={(e) => {
          pointer.current = e.pointerType;
        }}
        onClick={(e) => {
          if (pointer.current === "touch" && !open && q.spark?.length) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="font-semibold">{q.symbol}</span>
        <span>{price}</span>
        <span className={cn(dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-muted")}>{change}</span>
      </Link>
      {q.spark && q.spark.length > 1 ? (
        <span
          className={cn(
            "absolute left-0 top-full z-20 mt-1 w-40 rounded-brand border border-border bg-surface p-2 shadow-lg",
            open ? "block" : "hidden group-hover:block group-focus-within:block",
          )}
          data-testid="price-chip-chart"
          aria-hidden
        >
          <span className="mb-1 block text-xs text-muted">{q.name}, 7 days</span>
          <Sparkline values={q.spark} width={140} height={40} />
        </span>
      ) : null}
    </span>
  );
}
