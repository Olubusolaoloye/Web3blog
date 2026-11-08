import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import interWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import groteskWoff2 from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import stylesheet from "~/styles/globals.css?url";
import { getCountry, getCountryOrDefault } from "~/config/countries";
import { site } from "~/config/site";
import { countryCookie, themeCookie } from "~/lib/cookies.server";
import { detectCountryFromHeaders } from "~/lib/geo";
import { parseTheme, type Theme } from "~/lib/theme";

// Headline + body fonts are preloaded. JetBrains Mono (prices) is not: it only styles small numbers, swaps in when
// ready, and preloading it delayed LCP on slow 4G in Lighthouse (docs/decisions.md).
export const links: Route.LinksFunction = () => [
  { rel: "preload", href: groteskWoff2, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: interWoff2, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const theme = parseTheme(await themeCookie.parse(cookieHeader));
  const savedCountry = getCountry(await countryCookie.parse(cookieHeader));

  // First visit: detect from geo-IP headers and persist so later requests are stable.
  const country = savedCountry ?? getCountryOrDefault(detectCountryFromHeaders(request.headers)?.code);
  const headers = new Headers();
  if (!savedCountry) headers.append("Set-Cookie", await countryCookie.serialize(country.code));

  return data({ theme, countryCode: country.code }, { headers });
}

/** Passes the first-visit Set-Cookie down so child `headers` exports can see it (and avoid CDN caching it). */
export const headers: Route.HeadersFunction = ({ loaderHeaders }) => loaderHeaders;

export function Layout({ children }: { children: React.ReactNode }) {
  const root = useRouteLoaderData<typeof loader>("root");
  const theme: Theme = root?.theme ?? "system";
  return (
    <html lang={site.locale} data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b1020" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";
  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    message = error.status === 404 ? "We couldn't find that page." : error.statusText || message;
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message;
  }
  return (
    <main className="container-content py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{message}</p>
      <a href="/" className="mt-6 inline-block text-signal-ink underline">
        Back to {site.name}
      </a>
    </main>
  );
}
