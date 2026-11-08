import { describe, expect, it } from "vitest";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import { convertUsd, getMockQuotes, MOCK_FX } from "~/lib/market/mock";

// Intl uses non-breaking spaces (U+00A0) between symbol and number in some locales.
const plain = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatPrice", () => {
  it("formats large local prices compactly", () => {
    expect(formatPrice(98_234_567, "NGN", "en-NG")).toBe("₦98.2M");
    expect(plain(formatPrice(98_234_567, "KES", "en-KE"))).toBe("Ksh 98.2M");
    expect(formatPrice(98_234_567, "GHS", "en-GH")).toBe("GH₵98.2M");
  });
  it("uses the local decimal convention for South Africa", () => {
    expect(plain(formatPrice(1_234_567, "ZAR", "en-ZA"))).toBe("R 1,2M");
  });
  it("keeps precision for small values", () => {
    expect(formatPrice(0.1234, "USD", "en-US")).toBe("$0.1234");
    expect(formatPrice(12.5, "NGN", "en-NG")).toBe("₦12.50");
    expect(formatPrice(4780, "NGN", "en-NG")).toBe("₦4,780");
  });
});

describe("formatChange", () => {
  it("adds arrows", () => {
    expect(formatChange(2.14)).toBe("▲2.1%");
    expect(formatChange(-0.8)).toBe("▼0.8%");
    expect(formatChange(0)).toBe("•0.0%");
    expect(changeDirection(-1)).toBe("down");
  });
});

describe("mock market data", () => {
  it("converts USD to each launch currency", () => {
    for (const c of ["NGN", "KES", "ZAR", "GHS"]) expect(convertUsd(10, c)).toBeCloseTo(10 * (MOCK_FX[c] as number));
    expect(() => convertUsd(1, "XXX")).toThrow();
  });
  it("returns the top 10 for the ticker and filters by id", () => {
    expect(getMockQuotes("NGN")).toHaveLength(10);
    const [btc] = getMockQuotes("NGN", ["bitcoin"]);
    expect(btc?.price).toBe(64250 * 1530);
  });
});
