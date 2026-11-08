import { getCountry, type CountryConfig } from "~/config/countries";

/**
 * Reads the visitor's country from CDN geo headers. Used only on first visit, before hl_country exists.
 * - Netlify: `x-nf-geo` (base64 JSON with country.code) or `x-country`
 * - Vercel: `x-vercel-ip-country`
 * - Cloudflare: `cf-ipcountry`
 * Returns undefined when the country is unknown or not launched.
 */
export function detectCountryFromHeaders(headers: Headers): CountryConfig | undefined {
  const direct =
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? headers.get("x-country");
  if (direct) return getCountry(direct);

  const nfGeo = headers.get("x-nf-geo");
  if (nfGeo) {
    try {
      const json = JSON.parse(atob(nfGeo)) as { country?: { code?: string } };
      return getCountry(json.country?.code);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
