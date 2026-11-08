import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CoinGeckoProvider, mapChart, mapDetail, mapMarket, plainDescription } from "~/lib/market/coingecko.server";
import { ExchangeRateApiProvider } from "~/lib/market/fx.server";
import { createMarketServices } from "~/lib/market/service.server";

const fixture = (name: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, "../fixtures/coingecko", name), "utf8")) as unknown;

function fakeFetch(routes: Record<string, unknown>, status = 200) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    return Response.json(routes[key], { status });
  });
}

describe("CoinGecko response mapping (recorded response shapes)", () => {
  it("maps /coins/markets and drops coins without a price", () => {
    const coins = mapMarket(fixture("markets.json"));
    expect(coins.map((c) => c.id)).toEqual(["bitcoin", "tether"]);
    expect(coins[0]).toMatchObject({ symbol: "BTC", rank: 1, priceUsd: 64250, change24h: 2.1, change7d: 4.8, marketCapUsd: 1.27e12 });
    expect(coins[0]?.sparkline7d).toEqual([61000.5, 61500.25, 62800, 63100.75, 64250]); // nulls removed
    expect(coins[1]?.change7d).toBeNull();
  });

  it("maps /coins/{id} with contracts, plain-text description and USD ATH", () => {
    const d = mapDetail(fixture("coin-tether.json"));
    expect(d.platforms).toEqual({ ethereum: "0xdac17f958d2ee523a2206206994597c13d831ec7", tron: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" });
    expect(d.description).toBe("Tether (USDT) is a stablecoin pegged to the US dollar.\n\nIt is issued on many chains & widely used.");
    expect(d).toMatchObject({ homepage: "https://tether.to/", athUsd: 1.32, maxSupply: null, rank: 3 });
  });

  it("maps market charts and rejects malformed data", () => {
    expect(mapChart(fixture("chart.json"))).toHaveLength(3);
    expect(() => mapMarket([{ id: 1 }])).toThrow();
    expect(plainDescription(null)).toBe("");
  });
});

describe("CoinGeckoProvider HTTP", () => {
  it("uses the demo host and header by default", async () => {
    const f = fakeFetch({ "/coins/markets": fixture("markets.json") });
    const coins = await new CoinGeckoProvider("CG-demo", "demo", f as unknown as typeof fetch).getTopCoins();
    expect(coins).toHaveLength(2);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/api\.coingecko\.com\/api\/v3\/coins\/markets\?vs_currency=usd/);
    expect(url).toContain("per_page=250");
    expect(url).toContain("sparkline=true");
    expect((init.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe("CG-demo");
  });

  it("uses the pro host and header on the pro plan", async () => {
    const f = fakeFetch({ "/market_chart": fixture("chart.json") });
    await new CoinGeckoProvider("CG-pro", "pro", f as unknown as typeof fetch).getChart("bitcoin", "1y");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://pro-api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365");
    expect((init.headers as Record<string, string>)["x-cg-pro-api-key"]).toBe("CG-pro");
  });

  it("returns null for unknown coins and throws on server errors", async () => {
    const provider = new CoinGeckoProvider("k", "demo", fakeFetch({}) as unknown as typeof fetch);
    expect(await provider.getCoinDetail("nope")).toBeNull();
    const failing = new CoinGeckoProvider("k", "demo", fakeFetch({ "/coins/markets": {} }, 429) as unknown as typeof fetch);
    await expect(failing.getTopCoins()).rejects.toThrow(/429/);
  });
});

describe("FX provider", () => {
  it("parses the free and keyed ExchangeRate-API responses", async () => {
    const free = fakeFetch({ "open.er-api.com": { result: "success", base_code: "USD", rates: { NGN: 1532.7, KES: 129.2 } } });
    expect(await new ExchangeRateApiProvider(undefined, free as unknown as typeof fetch).getRates()).toEqual({ NGN: 1532.7, KES: 129.2 });
    const keyed = fakeFetch({ "v6.exchangerate-api.com/v6/KEY/latest/USD": { result: "success", conversion_rates: { ZAR: 18.05 } } });
    expect(await new ExchangeRateApiProvider("KEY", keyed as unknown as typeof fetch).getRates()).toEqual({ ZAR: 18.05 });
    const bad = fakeFetch({ "open.er-api.com": { result: "error" } });
    await expect(new ExchangeRateApiProvider(undefined, bad as unknown as typeof fetch).getRates()).rejects.toThrow();
  });
});

describe("createMarketServices", () => {
  it("uses sample data without a key, CoinGecko with one, Upstash when configured", () => {
    expect(createMarketServices({}).provider.name).toBe("fixtures");
    expect(createMarketServices({}).sample).toBe(true);
    const live = createMarketServices({ COINGECKO_API_KEY: "k", UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" });
    expect(live.provider.name).toBe("coingecko");
    expect(live.cache.store.name).toBe("upstash");
    expect(live.sample).toBe(false);
    expect(createMarketServices({ COINGECKO_API_KEY: "k", MARKET_DATA_SOURCE: "fixtures" }).provider.name).toBe("fixtures");
  });
});
