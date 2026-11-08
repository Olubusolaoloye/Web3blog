import { describe, expect, it } from "vitest";
import { coinSteps, fiatSteps, niceRound } from "~/lib/market/amounts";
import { scannableContract } from "~/lib/market/chains";
import { coinToFiat, downsample, fiatToCoin, fxRate, p2pPremiumPct, toLocalQuote, usdTo } from "~/lib/market/convert";
import { FIXTURE_FX } from "~/lib/market/fixtures";
import { formatPrice } from "~/lib/market/format";
import { sparklinePath, trend } from "~/lib/market/sparkline";
import type { CoinMarket } from "~/lib/market/types";

const plain = (s: string) => s.replace(/\u00a0/g, " ");
const btc: CoinMarket = {
  id: "bitcoin", symbol: "BTC", name: "Bitcoin", rank: 1, priceUsd: 64250, change24h: 2.1, change7d: 4.8,
  marketCapUsd: 1.27e12, volumeUsd: 3.1e10, sparkline7d: [60000, 61000, 62000, 63000, 64250],
};
// Realistic USD rates, independent of the fixtures, to prove the maths rather than echo the sample data.
const fx = { USD: 1, NGN: 1532.75, KES: 129.2, ZAR: 18.05, GHS: 15.62 };

describe("price conversion in NGN, KES, ZAR and GHS (Phase 3 acceptance)", () => {
  it.each([
    ["NGN", "en-NG", 98_479_187.5, "₦98.5M"],
    ["KES", "en-KE", 8_301_100, "Ksh 8.3M"],
    ["ZAR", "en-ZA", 1_159_712.5, "R 1,2M"],
    ["GHS", "en-GH", 1_003_585, "GH₵1M"],
  ] as const)("BTC in %s", (currency, locale, expected, formatted) => {
    const q = toLocalQuote(btc, currency, fx);
    expect(q.price).toBeCloseTo(expected, 2);
    expect(q.currency).toBe(currency);
    expect(plain(formatPrice(q.price, currency, locale))).toBe(formatted);
    // the mini chart is converted with the same rate (rounded to 5 significant digits)
    expect(Math.abs((q.spark?.at(-1) as number) / (64250 * fx[currency]) - 1)).toBeLessThan(1e-4);
  });

  it("converts coin ↔ fiat both ways", () => {
    expect(coinToFiat(0.01, 64250, "NGN", fx)).toBeCloseTo(984_791.875, 3);
    expect(fiatToCoin(100_000, 64250, "KES", fx)).toBeCloseTo(100_000 / (64250 * 129.2), 12);
    expect(fiatToCoin(coinToFiat(0.5, 64250, "ZAR", fx), 64250, "ZAR", fx)).toBeCloseTo(0.5, 12);
    expect(usdTo(10, "USD", fx)).toBe(10);
  });

  it("refuses unknown or broken rates instead of showing a wrong price", () => {
    expect(() => fxRate(fx, "EUR")).toThrow(/EUR/);
    expect(() => fxRate({ NGN: 0 }, "NGN")).toThrow();
    expect(() => fxRate({ NGN: Number.NaN }, "NGN")).toThrow();
  });

  it("fixture FX covers every launch currency", () => {
    for (const c of ["NGN", "KES", "ZAR", "GHS"]) expect(FIXTURE_FX[c]).toBeGreaterThan(0);
  });

  it("computes the P2P premium", () => {
    expect(p2pPremiumPct(1550, 1500)).toBeCloseTo(3.333, 3);
    expect(p2pPremiumPct(1450, 1500)).toBeCloseTo(-3.333, 3);
    expect(p2pPremiumPct(1, 0)).toBe(0);
  });
});

describe("helpers", () => {
  it("downsamples keeping first and last", () => {
    const v = Array.from({ length: 168 }, (_, i) => i);
    const d = downsample(v, 24);
    expect(d).toHaveLength(24);
    expect(d[0]).toBe(0);
    expect(d.at(-1)).toBe(167);
    expect(downsample([1, 2], 24)).toEqual([1, 2]);
  });
  it("picks nice amounts for conversion tables", () => {
    expect(niceRound(15_327.5)).toBe(20_000);
    expect(niceRound(129.2)).toBe(100);
    expect(fiatSteps(1532.75)).toEqual([20_000, 100_000, 200_000, 1_000_000, 2_000_000]);
    expect(fiatSteps(18.05)).toEqual([200, 1_000, 2_000, 10_000, 20_000]);
    expect(coinSteps(64250)[0]).toBe(0.0001);
    expect(coinSteps(1)).toContain(1000);
  });
  it("finds a scannable contract", () => {
    expect(scannableContract({ tron: "T1", "binance-smart-chain": "0xb" })).toEqual({ chain: "bsc", address: "0xb" });
    expect(scannableContract({})).toBeUndefined();
  });
  it("draws sparklines", () => {
    expect(sparklinePath([1, 2, 3], 100, 20, 0)).toBe("M0.0 20.0L50.0 10.0L100.0 0.0");
    expect(sparklinePath([1], 10, 10)).toBe("");
    expect(trend([3, 1])).toBe("down");
  });
});
