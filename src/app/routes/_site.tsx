import { Outlet, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/_site";
import { Footer } from "~/components/layout/Footer";
import { Header } from "~/components/layout/Header";
import { Ticker } from "~/components/layout/Ticker";
import { getCountryOrDefault } from "~/config/countries";
import { resolveCountry } from "~/lib/country.server";
import { getMockQuotes } from "~/lib/market/mock";
import type { loader as rootLoader } from "~/app/root";

export async function loader({ request }: Route.LoaderArgs) {
  const country = await resolveCountry(request);
  // Mocked in Phase 1–2; Phase 3 swaps in the cached CoinGecko + FX adapter.
  return { countryCode: country.code, ticker: getMockQuotes(country.currency) };
}

export default function SiteLayout({ loaderData }: Route.ComponentProps) {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const country = getCountryOrDefault(loaderData.countryCode);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-brand focus:bg-signal focus:px-3 focus:py-2 focus:text-on-signal">
        Skip to content
      </a>
      <Ticker quotes={loaderData.ticker} locale={country.locale} />
      <Header country={country} theme={root?.theme ?? "system"} />
      <main id="main" className="min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
