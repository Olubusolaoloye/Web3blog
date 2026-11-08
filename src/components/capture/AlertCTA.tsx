import { useState } from "react";
import { flags } from "~/config/flags";
import { formatPrice } from "~/lib/market/format";

interface Props {
  symbol: string;
  currency: string;
  locale: string;
  currentPrice: number;
}

const symbolFor = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

/**
 * "Alert me when BTC hits ₦___" (CLAUDE.md §4). UI only until accounts and alerts ship (Phases 4 and 6):
 * submitting explains that and points to the newsletter, rather than pretending an alert was created.
 */
export function AlertCTA({ symbol, currency, locale, currentPrice }: Props) {
  const [sent, setSent] = useState(false);
  const channels = [
    { value: "telegram", label: "Telegram" },
    ...(flags.whatsappAlerts ? [{ value: "whatsapp", label: "WhatsApp" }] : []),
    { value: "email", label: "Email" },
  ];
  return (
    <section aria-labelledby="alert-cta" className="rounded-brand border border-border bg-surface p-4" data-testid="alert-cta">
      <h2 id="alert-cta" className="text-lg font-semibold">
        Alert me when {symbol} hits…
      </h2>
      {sent ? (
        <p role="status" className="mt-2 text-sm">
          Price alerts are launching soon. Sign up for the newsletter below and we'll tell you the moment they're live.
        </p>
      ) : (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label className="flex items-center gap-2 rounded-brand border border-border bg-bg px-3">
            <span className="text-muted">{symbolFor(currency, locale)}</span>
            <span className="sr-only">Target price in {currency}</span>
            <input
              name="target"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              required
              placeholder={String(Math.round(currentPrice))}
              className="h-11 w-full bg-transparent tabular"
            />
          </label>
          <label>
            <span className="sr-only">Send alert by</span>
            <select name="channel" className="h-11 w-full rounded-brand border border-border bg-bg px-3">
              {channels.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-11 rounded-brand bg-signal px-5 font-semibold text-on-signal">
            Set alert
          </button>
          <p className="text-xs text-muted sm:col-span-3">Now {formatPrice(currentPrice, currency, locale)}. Not financial advice.</p>
        </form>
      )}
    </section>
  );
}
