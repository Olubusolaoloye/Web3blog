import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { action as partnersAction } from "~/app/routes/_site.partners";
import { action as subscribeAction } from "~/app/routes/api.subscribe";
import { setCaptureDeps, type CaptureDeps } from "~/lib/capture/deps.server";
import { MemoryRateLimiter } from "~/lib/capture/rate-limit.server";
import { utmCookie } from "~/lib/capture/request.server";
import { MemoryCaptureStore } from "~/lib/capture/stores.server";
import { OutboxNotifier } from "~/lib/messaging/notify.server";
import type { NewsletterProvider } from "~/lib/newsletter/beehiiv.server";
import { ManualInvoiceProvider } from "~/lib/payments/provider.server";

let store: MemoryCaptureStore;
let notifier: OutboxNotifier;
let newsletter: NewsletterProvider & { subscribe: ReturnType<typeof vi.fn> };

beforeEach(() => {
  process.env.TRUSTED_IP_HEADER = "x-test-ip";
  store = new MemoryCaptureStore();
  notifier = new OutboxNotifier();
  newsletter = { name: "fake", subscribe: vi.fn(async () => ({ id: "bh_1" })) };
  const deps: CaptureDeps = { store, notifier, newsletter, payments: new ManualInvoiceProvider(), limiter: new MemoryRateLimiter() };
  setCaptureDeps(deps);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  setCaptureDeps(undefined);
  vi.restoreAllMocks();
});

type Res = { data: Record<string, unknown> & { ok: boolean }; init?: { status?: number } | null };
async function post(handler: typeof subscribeAction | typeof partnersAction, fields: Record<string, string | string[]>, opts: { ip?: string; cookie?: string } = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) body.append(k, x);
  const headers: Record<string, string> = { "x-test-ip": opts.ip ?? "10.0.0.1" };
  if (opts.cookie) headers.cookie = opts.cookie;
  const request = new Request("https://site.test/x", { method: "POST", body, headers });
  return (await handler({ request, params: {}, context: {} } as never)) as unknown as Res;
}

const sub = { email: "Reader@Example.com", country: "gh", source: "end-of-article:/news/bitcoin", website: "" };

describe("subscribe action", () => {
  it("stores the subscriber with source and UTM, sends to beehiiv and marks active", async () => {
    const cookie = (await utmCookie.serialize({ utm_source: "whatsapp", utm_campaign: "launch" })).split(";")[0];
    const res = await post(subscribeAction, sub, { cookie });
    expect(res.data).toEqual({ ok: true });
    expect(store.subscribers).toHaveLength(1);
    expect(store.subscribers[0]).toMatchObject({
      email: "reader@example.com",
      country_code: "gh",
      source: "end-of-article:/news/bitcoin",
      utm: { utm_source: "whatsapp", utm_campaign: "launch" },
      status: "active",
      beehiiv_id: "bh_1",
    });
    expect(newsletter.subscribe).toHaveBeenCalledWith(expect.objectContaining({ email: "reader@example.com", source: "end-of-article:/news/bitcoin" }));
  });

  it("records interests (AlertCTA)", async () => {
    await post(subscribeAction, { ...sub, source: "alert-cta:/markets/bitcoin", interests: "price-alerts" });
    expect(store.subscribers[0]?.interests).toEqual(["price-alerts"]);
  });

  it("returns success for an existing email without duplicating or re-sending", async () => {
    await post(subscribeAction, sub);
    const again = await post(subscribeAction, { ...sub, source: "homepage:/" });
    expect(again.data.ok).toBe(true);
    expect(store.subscribers).toHaveLength(1);
    expect(newsletter.subscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps the row (pending) if beehiiv fails", async () => {
    newsletter.subscribe.mockRejectedValueOnce(new Error("beehiiv 500"));
    expect((await post(subscribeAction, sub)).data.ok).toBe(true);
    expect(store.subscribers[0]?.status).toBe("pending");
  });

  it("spam: honeypot gets a generic error and stores nothing", async () => {
    const res = await post(subscribeAction, { ...sub, website: "http://spam.example" });
    expect(res.init?.status).toBe(400);
    expect(res.data.error).toBe("Something went wrong. Please try again.");
    expect(store.subscribers).toHaveLength(0);
  });

  it("spam: rate limits each IP to 5 attempts per 10 minutes", async () => {
    for (let i = 0; i < 5; i++) expect((await post(subscribeAction, { ...sub, email: `r${i}@x.co` }, { ip: "9.9.9.9" })).data.ok).toBe(true);
    const blocked = await post(subscribeAction, { ...sub, email: "r6@x.co" }, { ip: "9.9.9.9" });
    expect(blocked.init?.status).toBe(429);
    expect(store.subscribers).toHaveLength(5);
    expect((await post(subscribeAction, { ...sub, email: "other@x.co" }, { ip: "8.8.8.8" })).data.ok).toBe(true);
  });

  it("validates input", async () => {
    expect((await post(subscribeAction, { ...sub, email: "nope" })).init?.status).toBe(400);
    expect((await post(subscribeAction, { ...sub, country: "us" })).init?.status).toBe(400);
    expect((await post(subscribeAction, { ...sub, interests: "casino" })).init?.status).toBe(400);
  });
});

const booking = {
  name: "Ada Obi",
  email: "ada@startup.io",
  company: "Startup Ltd",
  website: "https://startup.io",
  telegram: "@adaobi",
  package: "launch-in-nigeria",
  budget: "1k-5k",
  countries: ["ng", "gh"],
  message: "We launch in Q1.",
  consent: "on",
  fax_number: "",
};

describe("partners booking action", () => {
  it("creates a lead and a pending order priced from the CMS, then notifies the team and the customer", async () => {
    const res = await post(partnersAction, { ...booking, amount_usd: "1", price: "1" }); // tampered fields are ignored
    expect(res.data).toMatchObject({ ok: true, packageName: "Launch in Nigeria" });
    expect(store.leads).toHaveLength(1);
    expect(store.leads[0]).toMatchObject({ email: "ada@startup.io", service: "launch-in-nigeria", countries: ["ng", "gh"], status: "new", source: "partners:/partners" });
    expect(store.orders).toHaveLength(1);
    expect(store.orders[0]).toMatchObject({ lead_id: store.leads[0]?.id, package_code: "launch-in-nigeria", amount_usd: 3500, status: "pending" });
    expect(store.orders[0]?.payment_ref).toBe(res.data.reference);
    expect(notifier.team).toHaveLength(1);
    expect(notifier.team[0]).toContain("New booking: Launch in Nigeria ($3,500.00)");
    expect(notifier.team[0]).toContain("ada@startup.io");
    expect(notifier.emails).toEqual([expect.objectContaining({ to: "ada@startup.io", subject: expect.stringContaining(String(res.data.reference)) })]);
  });

  it("still confirms the booking when a notification channel fails", async () => {
    vi.spyOn(notifier, "notifyTeam").mockResolvedValueOnce(["telegram: down"]);
    vi.spyOn(notifier, "sendEmail").mockRejectedValueOnce(new Error("resend down"));
    expect((await post(partnersAction, booking)).data.ok).toBe(true);
    expect(store.orders).toHaveLength(1);
  });

  it("spam: honeypot, link stuffing and rate limits", async () => {
    expect((await post(partnersAction, { ...booking, fax_number: "555" })).data.error).toBe("Something went wrong. Please try again.");
    expect((await post(partnersAction, { ...booking, message: "http://a http://b http://c http://d" })).data.fieldErrors).toHaveProperty("message");
    expect(store.leads).toHaveLength(0);
    for (let i = 0; i < 3; i++) await post(partnersAction, booking, { ip: "7.7.7.7" });
    expect((await post(partnersAction, booking, { ip: "7.7.7.7" })).init?.status).toBe(429);
    expect(store.leads).toHaveLength(3);
  });

  it("validates fields and rejects unknown packages", async () => {
    const res = await post(partnersAction, { ...booking, email: "x", countries: [] as string[], consent: "" });
    expect(Object.keys(res.data.fieldErrors as object)).toEqual(expect.arrayContaining(["email", "countries", "consent"]));
    expect((await post(partnersAction, { ...booking, package: "casino-ads" })).init?.status).toBe(400);
  });
});

describe("/api/test-outbox guard", () => {
  it("404s unless E2E_TEST_MODE=1 with in-memory stores", async () => {
    const { loader, action } = await import("~/app/routes/api.test-outbox");
    delete process.env.E2E_TEST_MODE;
    expect(loader().status).toBe(404);
    expect(action({} as never).status).toBe(404);
    process.env.E2E_TEST_MODE = "1";
    expect(loader().status).toBe(200);
    setCaptureDeps({ ...(await import("~/lib/capture/deps.server")).createCaptureDeps({ VITE_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" }) });
    expect(loader().status).toBe(404); // a real database is never exposed
    delete process.env.E2E_TEST_MODE;
  });
});
