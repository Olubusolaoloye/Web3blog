import { describe, expect, it, vi } from "vitest";
import { NetlifyPurger, NoopPurger } from "~/lib/cache/purge.server";
import { handleRevalidate, SIGNATURE_HEADER, signPayload, tagsFor, verifySignature } from "~/lib/cache/revalidate.server";

const SECRET = "test-secret";
const NOW = 1_762_600_000_000;

function req(body: string, signature?: string) {
  return new Request("http://x/api/revalidate", {
    method: "POST",
    body,
    headers: signature ? { [SIGNATURE_HEADER]: signature } : {},
  });
}

describe("webhook signature", () => {
  const body = JSON.stringify({ _type: "article", slug: "a" });
  it("accepts a valid signature", () => {
    expect(verifySignature(body, signPayload(body, SECRET, NOW), SECRET, NOW)).toBe(true);
  });
  it("rejects wrong secret, tampered body, stale or malformed headers", () => {
    expect(verifySignature(body, signPayload(body, "other", NOW), SECRET, NOW)).toBe(false);
    expect(verifySignature(body + " ", signPayload(body, SECRET, NOW), SECRET, NOW)).toBe(false);
    expect(verifySignature(body, signPayload(body, SECRET, NOW - 10 * 60_000), SECRET, NOW)).toBe(false);
    expect(verifySignature(body, "garbage", SECRET, NOW)).toBe(false);
    expect(verifySignature(body, null, SECRET, NOW)).toBe(false);
  });
});

describe("tagsFor", () => {
  it("purges the article, homepage and sitemaps when an article is published", () => {
    expect(tagsFor({ _type: "article", slug: "a" })).toEqual(["article:a", "home", "news-index", "sitemaps"]);
    expect(tagsFor({ _type: "sponsoredPost", slug: "p" })).toEqual(["press:p", "press", "sitemaps"]);
    expect(tagsFor({ _type: "siteSettings" })).toEqual(["home"]);
  });
});

describe("handleRevalidate", () => {
  const body = JSON.stringify({ _type: "article", slug: "bitcoin" });

  it("purges tags for a signed request", async () => {
    const purger = new NoopPurger();
    const res = await handleRevalidate(req(body, signPayload(body, SECRET, NOW)), { secret: SECRET, purger, now: NOW });
    expect(res.status).toBe(200);
    expect(purger.purged).toEqual([["article:bitcoin", "home", "news-index", "sitemaps"]]);
  });

  it("rejects unsigned requests and does not purge", async () => {
    const purger = new NoopPurger();
    expect((await handleRevalidate(req(body), { secret: SECRET, purger, now: NOW })).status).toBe(401);
    expect(purger.purged).toEqual([]);
  });

  it("is disabled without a secret", async () => {
    const res = await handleRevalidate(req(body, "t=1,v1=x"), { secret: undefined, purger: new NoopPurger() });
    expect(res.status).toBe(503);
  });

  it("accepts slug objects too", async () => {
    const b = JSON.stringify({ _type: "article", slug: { current: "x" } });
    const purger = new NoopPurger();
    await handleRevalidate(req(b, signPayload(b, SECRET, NOW)), { secret: SECRET, purger, now: NOW });
    expect(purger.purged[0]?.[0]).toBe("article:x");
  });
});

describe("NetlifyPurger", () => {
  it("calls the purge API with cache tags", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    await new NetlifyPurger("site-1", "tok", fetchMock as unknown as typeof fetch).purgeTags(["home"]);
    expect(fetchMock).toHaveBeenCalledWith("https://api.netlify.com/api/v1/purge", expect.objectContaining({ method: "POST" }));
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string)).toEqual({ site_id: "site-1", cache_tags: ["home"] });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
  it("throws on failure", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(new NetlifyPurger("s", "t", fetchMock as unknown as typeof fetch).purgeTags(["x"])).rejects.toThrow();
  });
});
