import { describe, expect, it, vi } from "vitest";
import { MemoryStore, SwrCache, TTL, UpstashStore, UpstreamLimiter, UpstreamUnavailableError } from "~/lib/market/cache";
import { fixtureFxProvider, fixtureMarketProvider } from "~/lib/market/fixtures";
import { MarketService, type MarketServices } from "~/lib/market/service.server";
import type { MarketProvider } from "~/lib/market/types";

function clock(start = 1_762_600_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("SwrCache", () => {
  it("serves fresh values without calling upstream", async () => {
    const c = clock();
    const cache = new SwrCache(new MemoryStore(c.now), undefined, c.now);
    const load = vi.fn(async () => 1);
    expect((await cache.get("k", TTL.prices, load)).source).toBe("upstream");
    c.advance(59_000);
    expect(await cache.get("k", TTL.prices, load)).toEqual({ value: 1, source: "fresh" });
    expect(load).toHaveBeenCalledTimes(1);
    c.advance(2_000);
    await cache.get("k", TTL.prices, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one upstream request between concurrent misses (single-flight)", async () => {
    const cache = new SwrCache(new MemoryStore());
    let resolve!: (v: number) => void;
    const load = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const all = Promise.all(Array.from({ length: 50 }, () => cache.get("k", TTL.prices, load)));
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
    resolve(42);
    expect((await all).every((r) => r.value === 42)).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves stale data when upstream fails", async () => {
    const c = clock();
    const cache = new SwrCache(new MemoryStore(c.now), undefined, c.now);
    await cache.get("k", TTL.prices, async () => "old");
    c.advance(5 * 60_000);
    const r = await cache.get("k", TTL.prices, async () => {
      throw new Error("CoinGecko 500");
    });
    expect(r).toEqual({ value: "old", source: "stale" });
  });

  it("throws a typed error when there is nothing to fall back on", async () => {
    const cache = new SwrCache(new MemoryStore());
    await expect(cache.get("k", TTL.prices, async () => Promise.reject(new Error("down")))).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it("serves stale instead of exceeding the upstream rate limit", async () => {
    const c = clock();
    const limiter = new UpstreamLimiter(2, 60_000, c.now);
    const cache = new SwrCache(new MemoryStore(c.now), limiter, c.now);
    const load = vi.fn(async () => "v");
    await cache.get("a", TTL.prices, load);
    await cache.get("b", TTL.prices, load);
    c.advance(61_000); // both stale now, and a new window starts
    await cache.get("a", TTL.prices, load);
    await cache.get("b", TTL.prices, load);
    const third = await cache.get("a", { fresh: 0, stale: 3600 }, load); // budget used up in this window
    expect(third.source).toBe("stale");
    expect(load).toHaveBeenCalledTimes(4);
    await expect(cache.get("never-seen", TTL.prices, load)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it("keeps a reserve so optional data can't use the last calls in a window", () => {
    const limiter = new UpstreamLimiter(3);
    expect(limiter.tryTake(2)).toBe(true);
    expect(limiter.tryTake(2)).toBe(false); // optional request: 1 used, 2 reserved
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(true);
    expect(limiter.tryTake()).toBe(false);
  });

  it("MemoryStore expires entries after the stale window", async () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    await store.set("k", { value: 1, storedAt: c.now() }, 10);
    c.advance(10_001);
    expect(await store.get("k")).toBeNull();
  });
});

describe("UpstashStore", () => {
  it("talks to the Upstash REST API", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return Response.json({ result: url.includes("/get/") ? JSON.stringify({ value: 7, storedAt: 1 }) : "OK" });
    });
    const store = new UpstashStore("https://eu1.upstash.io/", "tok", fetchMock as unknown as typeof fetch);
    await store.set("market:x", { value: 7, storedAt: 1 }, 60);
    expect(await store.get("market:x")).toEqual({ value: 7, storedAt: 1 });
    expect(calls[0]?.[0]).toBe("https://eu1.upstash.io/set/market%3Ax?EX=60");
    expect(calls[0]?.[1]?.method).toBe("POST");
    expect((calls[0]?.[1]?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
});

/**
 * Phase 3 acceptance: "the CoinGecko rate limit is never hit in normal browsing".
 * Simulates an hour of heavy traffic (every page type, all four currencies, 50 coins, every chart range) against
 * one server instance and counts upstream calls per minute. CoinGecko's demo plan allows 30/min.
 */
describe("simulated browsing stays inside the CoinGecko quota", () => {
  it("never exceeds 25 upstream calls in any minute and refreshes prices at most once a minute", { timeout: 60_000 }, async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined); // chart misses under load are logged
    const c = clock();
    const callTimes: number[] = [];
    let topCalls = 0;
    const counting: MarketProvider = {
      name: "coingecko",
      getTopCoins: async () => {
        callTimes.push(c.now());
        topCalls++;
        return fixtureMarketProvider.getTopCoins();
      },
      getCoinDetail: async (id) => {
        callTimes.push(c.now());
        return fixtureMarketProvider.getCoinDetail(id);
      },
      getChart: async (id, range) => {
        callTimes.push(c.now());
        return fixtureMarketProvider.getChart(id, range);
      },
    };
    const services: MarketServices = {
      provider: counting,
      fx: fixtureFxProvider,
      cache: new SwrCache(new MemoryStore(c.now), new UpstreamLimiter(25, 60_000, c.now), c.now),
      sample: false,
    };
    const svc = new MarketService(services);
    const coins = (await fixtureMarketProvider.getTopCoins()).slice(0, 50).map((x) => x.id);
    const currencies = ["NGN", "KES", "ZAR", "GHS"];
    const ranges = ["1d", "7d", "1m", "1y"] as const;

    let views = 0;
    for (let second = 0; second < 3600; second++) {
      // ~10 page views per second, mixed across every page type.
      for (let v = 0; v < 10; v++) {
        const i = second * 10 + v;
        const cur = currencies[i % 4] as string;
        const coin = coins[(i * 7) % coins.length] as string;
        await svc.quotes(cur); // ticker on every page
        if (i % 3 === 0) await svc.table(cur, { page: 1 + (i % 4) });
        if (i % 5 === 0) {
          await svc.coin(coin);
          await svc.chart(coin, ranges[i % 4] as (typeof ranges)[number], cur);
        }
        views++;
      }
      c.advance(1000);
    }

    const perMinute = new Map<number, number>();
    const start = callTimes[0] ?? 0;
    for (const t of callTimes) {
      const minute = Math.floor((t - start) / 60_000);
      perMinute.set(minute, (perMinute.get(minute) ?? 0) + 1);
    }
    expect(views).toBe(36_000);
    expect(Math.max(...perMinute.values())).toBeLessThanOrEqual(25);
    expect(topCalls).toBeLessThanOrEqual(61); // ≈ one refresh per minute for an hour
    expect(topCalls).toBeGreaterThanOrEqual(59); // and charts never starve the price list (limiter reserve)
    expect(services.cache.stats.fresh).toBeGreaterThan(views); // almost everything is served from cache
  });
});
