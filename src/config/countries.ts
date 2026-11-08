/**
 * Supported countries. Adding a market (e.g. India, Philippines) is a data change here
 * plus a `country` document in Sanity. Nothing else should need to change.
 */
export type CountryCode = "ng" | "ke" | "za" | "gh" | "in" | "ph";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  /** ISO-4217 */
  currency: string;
  /** BCP-47 locale used for number/date formatting. */
  locale: string;
  flag: string;
  /** Launched countries appear in the switcher, hubs and sitemaps. */
  launched: boolean;
}

export const countries: readonly CountryConfig[] = [
  { code: "ng", name: "Nigeria", currency: "NGN", locale: "en-NG", flag: "🇳🇬", launched: true },
  { code: "ke", name: "Kenya", currency: "KES", locale: "en-KE", flag: "🇰🇪", launched: true },
  { code: "za", name: "South Africa", currency: "ZAR", locale: "en-ZA", flag: "🇿🇦", launched: true },
  { code: "gh", name: "Ghana", currency: "GHS", locale: "en-GH", flag: "🇬🇭", launched: true },
  { code: "in", name: "India", currency: "INR", locale: "en-IN", flag: "🇮🇳", launched: false },
  { code: "ph", name: "Philippines", currency: "PHP", locale: "en-PH", flag: "🇵🇭", launched: false },
] as const;

export const DEFAULT_COUNTRY: CountryCode = "ng";

export const launchedCountries = countries.filter((c) => c.launched);

export function getCountry(code: string | null | undefined): CountryConfig | undefined {
  if (!code) return undefined;
  const normalized = code.toLowerCase();
  return launchedCountries.find((c) => c.code === normalized);
}

export function getCountryOrDefault(code: string | null | undefined): CountryConfig {
  return getCountry(code) ?? (getCountry(DEFAULT_COUNTRY) as CountryConfig);
}
