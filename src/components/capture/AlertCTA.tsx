import { useEffect } from "react";
import { Link, useFetcher, useLocation } from "react-router";
import type { CountryCode } from "~/config/countries";
import { flags } from "~/config/flags";
import { track } from "~/lib/analytics/track";
import { formatPrice } from "~/lib/market/format";

interface Props {
  symbol: string;
  currency: string;
  locale: string;
  country: CountryCode;
  currentPrice: number;
}

type Result = { ok: true } | { ok: false; error: string };

const symbolFor = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

/**
 * "Alert me when BTC hits ₦___" (CLAUDE.md §4). Until accounts and alerts ship (Phase 6) this signs the reader up
 * with interest `price-alerts` and source `alert-cta:<path>`, and says plainly that alerts aren't live yet.
 */
export function AlertCTA({ symbol, currency, locale, country, currentPrice }: Props) {
  const fetcher = useFetcher<Result>();
  const { pathname } = useLocation();
  const source = `alert-cta:${pathname}`;
  const ok = fetcher.data?.ok === true;
  useEffect(() => {
    if (ok) track("subscribe", { source, interest: "price-alerts" });
  }, [ok, source]);

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
      {ok ? (
        <p role="status" className="mt-2 text-sm">
          You're on the list. Price alerts are launching soon and we'll email you the moment you can switch yours on.
        </p>
      ) : (
        <fetcher.Form method="post" action="/api/subscribe" className="mt-3 grid gap-3" noValidate>
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="interests" value="price-alerts" />
          <input type="hidden" name="country" value={country} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-brand border border-border bg-bg px-3">
              <span className="text-muted">{symbolFor(currency, locale)}</span>
              <span className="sr-only">Target price in {currency}</span>
              <input name="target" type="number" inputMode="decimal" min="0" step="any" placeholder={String(Math.round(currentPrice))} className="tabular h-11 w-full bg-transparent" />
            </label>
            <label>
              <span className="sr-only">Send alert by</span>
              <select name="channel" className="h-11 w-full rounded-brand border border-border bg-bg px-3">
                {channels.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span className="sr-only">Email address</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-11 w-full rounded-brand border border-border bg-bg px-3" />
          </label>
          <button type="submit" disabled={fetcher.state !== "idle"} className="h-11 rounded-brand bg-signal px-5 font-semibold text-on-signal">
            Notify me
          </button>
          {fetcher.data && !fetcher.data.ok ? <p role="alert" className="text-sm text-alert">{fetcher.data.error}</p> : null}
          <p className="text-xs text-muted">
            Now {formatPrice(currentPrice, currency, locale)}. Not financial advice. See our <Link to="/privacy" className="underline">privacy policy</Link>.
          </p>
        </fetcher.Form>
      )}
    </section>
  );
}
