import { useEffect } from "react";
import { Link, useFetcher, useLocation } from "react-router";
import { track } from "~/lib/analytics/track";
import { launchedCountries, type CountryCode } from "~/config/countries";
import { site } from "~/config/site";
import { captureSource, type CaptureVariant } from "~/lib/capture/source";
import { cn } from "~/lib/utils";

type SubscribeResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

interface Props {
  variant: CaptureVariant;
  country: CountryCode;
  heading?: string;
  blurb?: string;
}

/**
 * Newsletter sign-up: email + country (optional experience). Records `source` = variant + path (CLAUDE.md §8).
 * Posts to /api/subscribe; the honeypot field `website` is hidden from people and filled in by bots.
 */
export function NewsletterBox({ variant, country, heading, blurb }: Props) {
  const fetcher = useFetcher<SubscribeResult>();
  const { pathname } = useLocation();
  const id = `nl-${variant}`;
  const result = fetcher.data;
  const busy = fetcher.state !== "idle";
  const source = captureSource(variant, pathname);
  const ok = result?.ok === true;
  useEffect(() => {
    if (ok) track("subscribe", { source });
  }, [ok, source]);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-brand border border-border bg-surface p-4 sm:p-6",
        variant === "inline" && "border-l-4 border-l-signal",
      )}
      data-testid={`newsletter-${variant}`}
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {heading ?? "Get the daily brief"}
      </h2>
      <p className={cn("mt-1 text-sm text-muted", variant === "sticky-footer" && "hidden sm:block")}>
        {blurb ?? "The crypto news that matters for your country, prices in your currency, and scam alerts. Free, every weekday."}
      </p>

      {result?.ok ? (
        <div role="status" className="mt-4 space-y-2">
          <p className="font-semibold text-signal-ink">You're on the list. Look out for our welcome email.</p>
          <p className="text-sm">
            Want alerts faster? Join us on{" "}
            <a className="underline" href={site.socials.whatsapp} rel="noopener">WhatsApp</a> or{" "}
            <a className="underline" href={site.socials.telegram} rel="noopener">Telegram</a>.
          </p>
        </div>
      ) : (
        <fetcher.Form method="post" action="/api/subscribe" className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]" noValidate>
          <input type="hidden" name="source" value={source} />
          <div className="absolute -left-[9999px]" aria-hidden>
            <label htmlFor={`${id}-website`}>Website</label>
            <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={result && !result.ok && result.fieldErrors?.email ? true : undefined}
              className="h-11 w-full rounded-brand border border-border bg-bg px-3 text-base"
            />
          </div>
          <div>
            <label htmlFor={`${id}-country`} className="sr-only">Country</label>
            <select id={`${id}-country`} name="country" defaultValue={country} className="h-11 w-full rounded-brand border border-border bg-bg px-3">
              {launchedCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-brand bg-signal px-5 font-semibold text-on-signal hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Signing up…" : "Subscribe"}
          </button>
          {result && !result.ok ? (
            <p role="alert" className="text-sm text-alert sm:col-span-3">
              {result.error}
            </p>
          ) : null}
          <p className="text-xs text-muted sm:col-span-3">
            By subscribing you agree to receive emails from {site.name}. Unsubscribe any time. See our{" "}
            <Link to="/privacy" className="underline">privacy policy</Link>.
          </p>
        </fetcher.Form>
      )}
    </section>
  );
}
