import { useEffect } from "react";
import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/_site";
import { BodyHtml } from "~/components/article/BodyHtml";
import { Header } from "~/components/layout/Header";
import { Ticker } from "~/components/layout/Ticker";
import { getCountryOrDefault } from "~/config/countries";
import { resolveCountry } from "~/lib/country.server";
import { footerHtml } from "~/lib/layout/footer-html.server";
import { getMarketServices, safeQuotes } from "~/lib/market/service.server";
import type { loader as rootLoader } from "~/app/root";

export async function loader({ request }: Route.LoaderArgs) {
  const country = await resolveCountry(request);
  // Top 10 by market cap from the cached market service; refreshed client-side via /api/prices.
  return {
    countryCode: country.code,
    ticker: await safeQuotes(country.currency),
    sample: getMarketServices().sample,
    footerHtml: footerHtml(),
  };
}

export default function SiteLayout({ loaderData }: Route.ComponentProps) {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const country = getCountryOrDefault(loaderData.countryCode);
  const { pathname } = useLocation();

  // Analytics + exit-intent live in one lazy chunk (decision 44).
  useEffect(() => {
    void import("~/lib/client/enhance").then((m) => m.onNavigate(pathname, country.code));
  }, [pathname, country.code]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-brand focus:bg-signal focus:px-3 focus:py-2 focus:text-on-signal">
        Skip to content
      </a>
      <Ticker quotes={loaderData.ticker} locale={country.locale} sample={loaderData.sample} />
      <Header country={country} theme={root?.theme ?? "system"} />
      <main id="main" className="min-h-[60vh]">
        <Outlet />
      </main>
      <BodyHtml as="footer" html={loaderData.footerHtml} />
    </>
  );
}
