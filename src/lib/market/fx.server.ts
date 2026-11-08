import { z } from "zod";
import type { FxProvider, FxRates } from "./types";

const freeSchema = z.object({ result: z.literal("success"), rates: z.record(z.string(), z.number()) });
const keyedSchema = z.object({ result: z.literal("success"), conversion_rates: z.record(z.string(), z.number()) });

/**
 * ExchangeRate-API: the free open endpoint (open.er-api.com, no key, daily updates) or, with FX_API_KEY,
 * the keyed v6 endpoint (more frequent updates). Both return USD-based rates.
 */
export class ExchangeRateApiProvider implements FxProvider {
  readonly name = "exchangerate-api";
  constructor(
    private readonly apiKey?: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getRates(): Promise<FxRates> {
    const url = this.apiKey
      ? `https://v6.exchangerate-api.com/v6/${encodeURIComponent(this.apiKey)}/latest/USD`
      : "https://open.er-api.com/v6/latest/USD";
    const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const json = (await res.json()) as unknown;
    return this.apiKey ? keyedSchema.parse(json).conversion_rates : freeSchema.parse(json).rates;
  }
}
