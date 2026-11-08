import { useFetcher, useLocation } from "react-router";
import { launchedCountries, type CountryConfig } from "~/config/countries";

interface Props {
  current: CountryConfig;
}

/**
 * Sets country + currency (cookie hl_country). Plain form POST to /api/country, so it works without JS
 * (the "Set" button only exists inside <noscript>); with JS it submits on change via a fetcher.
 */
export function CountrySwitcher({ current }: Props) {
  const fetcher = useFetcher();
  const location = useLocation();
  const pending = fetcher.formData?.get("country");
  const value = typeof pending === "string" ? pending : current.code;

  return (
    <fetcher.Form method="post" action="/api/country" className="flex items-center gap-1">
      <input type="hidden" name="redirectTo" value={location.pathname + location.search} />
      <label htmlFor="country-switcher" className="sr-only">
        Country and currency
      </label>
      <select
        id="country-switcher"
        name="country"
        value={value}
        onChange={(e) => fetcher.submit(e.currentTarget.form)}
        className="h-9 rounded-brand border border-border bg-surface px-2 text-sm"
        data-testid="country-switcher"
      >
        {launchedCountries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.currency}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-9 rounded-brand border border-border px-2 text-xs">
          Set
        </button>
      </noscript>
    </fetcher.Form>
  );
}
