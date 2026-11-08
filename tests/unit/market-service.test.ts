// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loader as pricesLoader } from "~/app/routes/api.prices";
import { HUB_COINS, loader as hubLoader } from "~/app/routes/_site.local.$country";
import { fixtureSource } from "~/lib/content/fixture-source";
import type { CountryDoc } from "~/lib/content/types";
import { fixtureDirectoryProvider } from "~/lib/directory/provider.server";
import { publicPageHeaders } from "~/lib/http/cache";
import { hasLocalContext, resolveConverter, validConverterPairs } from "~/lib/market/converters.server";
import { FIXTURE_COINS } from "~/lib/market/fixtures";
import { fixtureP2pProvider } from "~/lib/market/p2p.server";
import { MarketService } from "~/lib/market/service.server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { countries } from "~/config/countries";

const svc = new MarketService();

describe("MarketService (sample data)", () => {
  it("returns the top 10 for the ticker and specific coins in order", async () => {
    expect((await svc.quotes("NGN")).map((q) => q.symbol).slice(0, 3)).toEqual(["BTC", "ETH", "USDT"]);
    expect((await svc.quotes("KES", ["tether", "bitcoin", "unknown"])).map((q) => q.id)).toEqual(["tether", "bitcoin"]);
  });

  it("sorts and paginates the top 200 on the server", async () => {
    const p1 = await svc.table("ZAR", { perPage: 50 });
    expect(p1).toMatchObject({ total: 200, totalPages: 4, page: 1 });
    expect(p1.rows[0]?.rank).toBe(1);
    const byChange = await svc.table("ZAR", { sort: "change24h", dir: "desc", perPage: 200 });
    const changes = byChange.rows.map((r) => r.change24h);
    expect([...changes].sort((a, b) => b - a)).toEqual(changes);
    expect((await svc.table("ZAR", { page: 99 })).page).toBe(4);
  });

  it("prices one coin in every supported currency", async () => {
    const all = await svc.priceInAll(2);
    expect(all.map((a) => a.currency)).toEqual(["USD", "NGN", "KES", "ZAR", "GHS"]);
    expect(all.find((a) => a.currency === "GHS")?.price).toBeCloseTo(31.2);
  });

  it("returns local-currency charts", async () => {
    const usd = await svc.chart("bitcoin", "7d", "USD");
    const ngn = await svc.chart("bitcoin", "7d", "NGN");
    expect(ngn[5]?.[1]).toBeCloseTo((usd[5]?.[1] as number) * 1530);
  });
});

describe("converter pages: real local content or 404 (no thin pages)", () => {
  it("exists for top-50 coins in launched currencies with local context", async () => {
    expect(await resolveConverter("bitcoin", "ngn")).not.toBeNull();
    expect(await resolveConverter(FIXTURE_COINS[49]!.id, "ghs")).not.toBeNull();
  });

  it("404s outside the top 50, for unsupported or upper-case currencies, and without how-to-buy copy", async () => {
    expect(await resolveConverter(FIXTURE_COINS[50]!.id, "ngn")).toBeNull();
    expect(await resolveConverter("bitcoin", "usd")).toBeNull();
    expect(await resolveConverter("bitcoin", "inr")).toBeNull(); // India not launched yet
    expect(await resolveConverter("bitcoin", "NGN")).toBeNull();
    const noContext = {
      getCountry: async (code: string) => ({ ...((await fixtureSource.getCountry(code)) as CountryDoc), howToBuy: [] }),
    };
    expect(await resolveConverter("bitcoin", "ngn", { content: noContext })).toBeNull();
    expect(await validConverterPairs({ content: noContext })).toEqual([]);
  });

  it("lists every valid pair for the sitemap", async () => {
    const pairs = await validConverterPairs();
    expect(pairs).toHaveLength(200);
    expect(pairs).toContainEqual({ coinId: "bitcoin", currency: "kes" });
    expect(hasLocalContext(null)).toBe(false);
  });
});

describe("local hubs render from config + CMS data only", () => {
  const callHub = (country: string) => hubLoader({ params: { country }, request: new Request(`http://x/local/${country}`), context: {} } as never);

  it.each(["ng", "ke", "za", "gh"])("%s hub comes from its country doc", async (code) => {
    const doc = (await fixtureSource.getCountry(code)) as CountryDoc;
    const d = (await callHub(code)) as Awaited<ReturnType<typeof hubLoader>>;
    expect(d.country.code).toBe(code);
    expect(d.hubIntro).toBe(doc.hubIntro);
    const regulationText = (doc.regulationStatus[0] as { children: { text: string }[] }).children[0]!.text;
    expect(d.regulationHtml).toContain(regulationText.replace(/'/g, "&#x27;").slice(0, 40));
    expect(d.regulationUpdatedAt).toBe(doc.regulationUpdatedAt);
    expect(d.quotes.map((q) => q.id)).toEqual([...HUB_COINS]);
    expect(d.quotes.every((q) => q.currency === d.country.currency)).toBe(true);
    expect(d.p2p?.fiat).toBe(d.country.currency);
  });

  it("shows only verified recommended exchanges listed in the CMS doc", async () => {
    const d = (await callHub("ng")) as Awaited<ReturnType<typeof hubLoader>>;
    expect(d.exchanges.map((e) => e.slug)).toEqual(["sample-exchange-ng"]); // sample-wallet is listed but not verified
    expect(await fixtureDirectoryProvider.verifiedBySlugs(["sample-wallet"])).toEqual([]);
  });

  it("404s for unlaunched or unknown countries and non-canonical codes", async () => {
    for (const code of ["in", "ph", "zz", "NG"]) {
      await expect(callHub(code)).rejects.toMatchObject({ init: { status: 404 } });
    }
  });

  it("contains no hard-coded country copy (adding a market is just data)", () => {
    const src = readFileSync(resolve(import.meta.dirname, "../../src/app/routes/_site.local.$country.tsx"), "utf8");
    const has = (word: string, flags = "") => new RegExp(`\\b${word}\\b`, flags).test(src);
    for (const c of countries) {
      expect(has(c.name), c.name).toBe(false);
      expect(has(c.currency), c.currency).toBe(false);
    }
    for (const word of ["naira", "shillings?", "rand", "cedis?"]) expect(has(word, "i"), word).toBe(false);
    for (const word of ["SEC", "FSCA", "SARS", "M-Pesa"]) expect(has(word), word).toBe(false);
  });

  it("P2P fixtures cover every launch country", async () => {
    for (const code of ["ng", "ke", "za", "gh"]) expect(await fixtureP2pProvider.latest(code, "USDT")).toBeDefined();
    expect(await fixtureP2pProvider.latest("ng", "BTC")).toBeUndefined();
  });
});

describe("/api/prices", () => {
  const call = (qs: string) => pricesLoader({ request: new Request(`http://x/api/prices?${qs}`), params: {}, context: {} } as never);
  it("returns cached quotes in the requested currency", async () => {
    const res = await call("ids=bitcoin,tether&currency=ghs");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=60");
    const body = (await res.json()) as { currency: string; sample: boolean; quotes: { id: string; currency: string }[] };
    expect(body.currency).toBe("GHS");
    expect(body.sample).toBe(true);
    expect(body.quotes.map((q) => [q.id, q.currency])).toEqual([["bitcoin", "GHS"], ["tether", "GHS"]]);
  });
  it("validates input", async () => {
    expect((await call("ids=bitcoin&currency=EUR")).status).toBe(400);
    expect((await call("currency=NGN")).status).toBe(400);
    expect((await call("ids=../../etc&currency=NGN")).status).toBe(400);
    expect((await call(`ids=${Array.from({ length: 51 }, (_, i) => `c${i}`).join(",")}&currency=NGN`)).status).toBe(400);
  });
});

describe("HTTP caching for market pages", () => {
  it("caches at the CDN keyed on the two cookies", () => {
    const h = publicPageHeaders({ parentHeaders: new Headers(), loaderHeaders: new Headers() });
    expect(h.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    expect(h.get("Netlify-Vary")).toBe("cookie=hl_country|hl_theme");
  });
  it("never shares a response that sets a cookie", () => {
    const h = publicPageHeaders({ parentHeaders: new Headers({ "Set-Cookie": "hl_country=x" }), loaderHeaders: new Headers() });
    expect(h.get("Cache-Control")).toBe("private, no-store");
    expect(h.get("Set-Cookie")).toBe("hl_country=x");
  });
});
