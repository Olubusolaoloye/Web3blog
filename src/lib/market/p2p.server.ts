import { getSupabasePublic } from "~/lib/supabase/public.server";
import { FIXTURE_FX } from "./fixtures";

export interface P2pRate {
  countryCode: string;
  asset: string;
  fiat: string;
  /** Price a buyer pays per 1 asset, in fiat. */
  buy: number;
  /** Price a seller receives per 1 asset, in fiat. */
  sell: number;
  source: string;
  capturedAt: string;
  sample?: boolean;
}

/**
 * P2P rates come from the `p2p_rates` table. Phase 3: rows are entered manually (admin UI in Phase 7, SQL until then).
 * Scraper/API adapters implement the same interface later.
 */
export interface P2pProvider {
  readonly name: string;
  latest(countryCode: string, asset: string): Promise<P2pRate | undefined>;
}

export class SupabaseP2pProvider implements P2pProvider {
  readonly name = "supabase";
  async latest(countryCode: string, asset: string): Promise<P2pRate | undefined> {
    const db = getSupabasePublic();
    if (!db) return undefined;
    const { data, error } = await db
      .from("p2p_rates")
      .select("country_code, asset, fiat, buy, sell, source, captured_at")
      .eq("country_code", countryCode)
      .eq("asset", asset)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return undefined;
    return {
      countryCode: data.country_code,
      asset: data.asset,
      fiat: data.fiat,
      buy: Number(data.buy),
      sell: Number(data.sell),
      source: data.source,
      capturedAt: data.captured_at,
    };
  }
}

const CURRENCY_BY_COUNTRY: Record<string, string> = { ng: "NGN", ke: "KES", za: "ZAR", gh: "GHS" };

export const fixtureP2pProvider: P2pProvider = {
  name: "fixtures",
  async latest(countryCode, asset) {
    const fiat = CURRENCY_BY_COUNTRY[countryCode];
    const fx = fiat ? FIXTURE_FX[fiat] : undefined;
    if (!fiat || fx === undefined || asset !== "USDT") return undefined;
    return {
      countryCode,
      asset,
      fiat,
      buy: Number((fx * 1.012).toFixed(2)),
      sell: Number((fx * 0.998).toFixed(2)),
      source: "Sample data",
      capturedAt: "2026-11-08T08:00:00Z",
      sample: true,
    };
  },
};

export function getP2pProvider(): P2pProvider {
  return getSupabasePublic() ? new SupabaseP2pProvider() : fixtureP2pProvider;
}

export async function safeP2p(countryCode: string, asset = "USDT"): Promise<P2pRate | undefined> {
  try {
    return await getP2pProvider().latest(countryCode, asset);
  } catch (error) {
    console.error("[p2p] unavailable", error);
    return undefined;
  }
}
