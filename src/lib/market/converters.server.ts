import { launchedCountries, type CountryConfig } from "~/config/countries";
import { toPlainText } from "~/lib/content/reading-time";
import { getContentSource } from "~/lib/content/source.server";
import type { ContentSource, CountryDoc } from "~/lib/content/types";
import { MarketService } from "./service.server";
import type { CoinMarket } from "./types";

/** Converter pages exist for the top 50 coins (CLAUDE.md §7.3). */
export const CONVERTER_COIN_LIMIT = 50;
/** Minimum local "how to buy" copy for a converter page to count as real, unique content. */
export const MIN_LOCAL_CONTEXT_CHARS = 80;

export function hasLocalContext(doc: CountryDoc | null | undefined): doc is CountryDoc {
  return Boolean(doc) && toPlainText((doc as CountryDoc).howToBuy).trim().length >= MIN_LOCAL_CONTEXT_CHARS;
}

export interface ConverterContext {
  coin: CoinMarket;
  country: CountryConfig;
  doc: CountryDoc;
}

interface Deps {
  market?: Pick<MarketService, "topCoins">;
  content?: Pick<ContentSource, "getCountry">;
}

/**
 * Resolves /markets/:coin/to/:currency. Returns null (→ 404, and left out of the sitemap) unless:
 * the coin is in the top 50, the currency belongs to a launched country, and that country's CMS doc has local
 * "how to buy" context. No thin pages.
 */
export async function resolveConverter(coinId: string, currencyParam: string, deps: Deps = {}): Promise<ConverterContext | null> {
  const currency = currencyParam.toUpperCase();
  if (currencyParam !== currencyParam.toLowerCase()) return null; // canonical URLs are lower-case
  const country = launchedCountries.find((c) => c.currency === currency);
  if (!country) return null;
  const market = deps.market ?? new MarketService();
  const content = deps.content ?? getContentSource();
  const [coins, doc] = await Promise.all([market.topCoins(), content.getCountry(country.code)]);
  const coin = coins.slice(0, CONVERTER_COIN_LIMIT).find((c) => c.id === coinId);
  if (!coin || !hasLocalContext(doc)) return null;
  return { coin, country, doc };
}

/** Every valid converter page, for the sitemap. */
export async function validConverterPairs(deps: Deps = {}): Promise<Array<{ coinId: string; currency: string }>> {
  const market = deps.market ?? new MarketService();
  const content = deps.content ?? getContentSource();
  const coins = (await market.topCoins()).slice(0, CONVERTER_COIN_LIMIT);
  const docs = await Promise.all(launchedCountries.map(async (c) => [c, await content.getCountry(c.code)] as const));
  const withContext = docs.filter(([, doc]) => hasLocalContext(doc)).map(([c]) => c);
  return coins.flatMap((coin) => withContext.map((c) => ({ coinId: coin.id, currency: c.currency.toLowerCase() })));
}
