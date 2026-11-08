import { useId, useState } from "react";
import { formatAmount } from "~/lib/market/amounts";

interface Props {
  symbol: string;
  currency: string;
  /** Local price of 1 coin */
  price: number;
  locale: string;
}

/** Two-way coin ↔ fiat converter. Server renders 1 coin; inputs work after hydration. */
export function Converter({ symbol, currency, price, locale }: Props) {
  const id = useId();
  const [coin, setCoin] = useState("1");
  const [fiat, setFiat] = useState(formatAmount(price, "en", 2).replace(/,/g, ""));
  const parse = (v: string) => Number(v.replace(/,/g, ""));

  return (
    <form className="grid gap-3 rounded-brand border border-border bg-surface p-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} data-testid="converter">
      <label htmlFor={`${id}-coin`} className="space-y-1">
        <span className="text-sm text-muted">{symbol}</span>
        <input
          id={`${id}-coin`}
          inputMode="decimal"
          value={coin}
          onChange={(e) => {
            setCoin(e.target.value);
            const n = parse(e.target.value);
            setFiat(Number.isFinite(n) ? formatAmount(n * price, "en", 2).replace(/,/g, "") : "");
          }}
          className="tabular h-12 w-full rounded-brand border border-border bg-bg px-3 text-lg"
        />
      </label>
      <label htmlFor={`${id}-fiat`} className="space-y-1">
        <span className="text-sm text-muted">{currency}</span>
        <input
          id={`${id}-fiat`}
          inputMode="decimal"
          value={fiat}
          onChange={(e) => {
            setFiat(e.target.value);
            const n = parse(e.target.value);
            setCoin(Number.isFinite(n) && price > 0 ? formatAmount(n / price, "en").replace(/,/g, "") : "");
          }}
          className="tabular h-12 w-full rounded-brand border border-border bg-bg px-3 text-lg"
        />
      </label>
      <p className="text-xs text-muted sm:col-span-2" aria-live="polite">
        1 {symbol} = {new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(price)}
      </p>
    </form>
  );
}
