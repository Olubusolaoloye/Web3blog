import { getCountry, getCountryOrDefault, type CountryConfig } from "~/config/countries";
import { countryCookie } from "./cookies.server";
import { detectCountryFromHeaders } from "./geo";

/** Cookie first, then geo-IP, then the default market. */
export async function resolveCountry(request: Request): Promise<CountryConfig> {
  const saved = getCountry(await countryCookie.parse(request.headers.get("Cookie")));
  return saved ?? getCountryOrDefault(detectCountryFromHeaders(request.headers)?.code);
}
