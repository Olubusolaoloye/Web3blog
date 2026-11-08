import { describe, expect, it } from "vitest";
import { changeDirection, formatChange, formatPrice } from "~/lib/market/format";
import { usdTo } from "~/lib/market/convert";
import { FIXTURE_FX } from "~/lib/market/fixtures";

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

describe("fixture FX", () => {
  it("converts USD to each launch currency", () => {
    for (const c of ["NGN", "KES", "ZAR", "GHS"]) expect(usdTo(10, c, FIXTURE_FX)).toBeCloseTo(10 * (FIXTURE_FX[c] as number));
    expect(() => usdTo(1, "XXX", FIXTURE_FX)).toThrow();
  });
});
