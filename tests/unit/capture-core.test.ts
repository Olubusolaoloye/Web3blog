import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { clientIp, readUtm, utmCookie, utmFromRequest } from "~/lib/capture/request.server";
import { MemoryRateLimiter, UpstashRateLimiter } from "~/lib/capture/rate-limit.server";
import { MemoryCaptureStore, SupabaseCaptureStore } from "~/lib/capture/stores.server";
import { leadSchema, parseLeadForm } from "~/lib/capture/lead-schema";
import { BeehiivProvider } from "~/lib/newsletter/beehiiv.server";
import { LiveNotifier } from "~/lib/messaging/notify.server";
import { ManualInvoiceProvider } from "~/lib/payments/provider.server";
import type { Database } from "~/lib/supabase/database.types";

type Call = { url: string; init?: RequestInit };
function recorder(response: (url: string) => Response = () => Response.json({})) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    return response(url);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe("UTM attribution", () => {
  it("reads utm_* params, the landing path and an external referrer", () => {
    const req = new Request("https://site.test/news/a?utm_source=twitter&utm_medium=social&utm_campaign=launch&x=1", {
      headers: { referer: "https://t.co/abc" },
    });
    expect(utmFromRequest(req)).toEqual({ utm_source: "twitter", utm_medium: "social", utm_campaign: "launch", landing: "/news/a", referrer: "t.co" });
    expect(utmFromRequest(new Request("https://site.test/news/a"))).toBeNull();
  });

  it("round-trips through the hl_utm cookie", async () => {
    const cookie = (await utmCookie.serialize({ utm_source: "wa" })).split(";")[0] as string;
    expect(await readUtm(new Request("https://x", { headers: { cookie } }))).toEqual({ utm_source: "wa" });
    expect(await readUtm(new Request("https://x"))).toEqual({});
  });

  it("trusts only the configured client IP header", () => {
    const req = new Request("https://x", { headers: { "x-nf-client-connection-ip": "1.2.3.4", "x-forwarded-for": "6.6.6.6" } });
    expect(clientIp(req, "x-nf-client-connection-ip")).toBe("1.2.3.4");
    expect(clientIp(new Request("https://x", { headers: { "x-forwarded-for": "6.6.6.6" } }), "x-nf-client-connection-ip")).toBe("unknown");
  });
});

describe("rate limiters", () => {
  it("memory: fixed window per key", async () => {
    let t = 0;
    const rl = new MemoryRateLimiter(() => t);
    for (let i = 0; i < 3; i++) expect((await rl.limit("ip", 3, 60)).ok).toBe(true);
    expect((await rl.limit("ip", 3, 60)).ok).toBe(false);
    expect((await rl.limit("other", 3, 60)).ok).toBe(true);
    t = 61_000;
    expect((await rl.limit("ip", 3, 60)).ok).toBe(true);
  });

  it("upstash: INCR + EXPIRE NX in one pipeline", async () => {
    const r = recorder(() => Response.json([{ result: 4 }, { result: 0 }, { result: 42 }]));
    const res = await new UpstashRateLimiter("https://u.test", "tok", r.fn).limit("subscribe:1.2.3.4", 3, 600);
    expect(res).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 42 });
    expect(r.calls[0]?.url).toBe("https://u.test/pipeline");
    expect(JSON.parse(r.calls[0]?.init?.body as string)).toEqual([["INCR", "rl:subscribe:1.2.3.4"], ["EXPIRE", "rl:subscribe:1.2.3.4", "600", "NX"], ["TTL", "rl:subscribe:1.2.3.4"]]);
  });
});

describe("capture stores", () => {
  const sub = { email: "a@b.co", country_code: "ng", interests: [], source: "inline:/news/x", utm: { utm_source: "x" } };

  it("memory store keeps the first capture for an email", async () => {
    const s = new MemoryCaptureStore();
    const first = await s.addSubscriber(sub);
    const again = await s.addSubscriber({ ...sub, source: "homepage:/" });
    expect(first.created).toBe(true);
    expect(again).toEqual({ id: first.id, created: false });
    expect(s.subscribers).toHaveLength(1);
    expect(s.subscribers[0]?.source).toBe("inline:/news/x");
    await s.markSubscriberActive(first.id, "bh_1");
    expect(s.subscribers[0]).toMatchObject({ status: "active", beehiiv_id: "bh_1" });
  });

  it("Supabase store upserts with ignore-duplicates through PostgREST", async () => {
    const r = recorder((url) => (url.includes("/rest/v1/subscribers") ? Response.json([{ id: "row-1" }], { status: 201 }) : Response.json({})));
    const db = createClient<Database>("https://proj.supabase.co", "service-key", { global: { fetch: r.fn }, auth: { persistSession: false } });
    expect(await new SupabaseCaptureStore(db).addSubscriber(sub)).toEqual({ id: "row-1", created: true });
    const call = r.calls[0] as Call;
    expect(call.url).toContain("/rest/v1/subscribers?on_conflict=email");
    expect(call.init?.method).toBe("POST");
    expect(new Headers(call.init?.headers).get("prefer")).toContain("resolution=ignore-duplicates");
    expect(JSON.parse(call.init?.body as string)).toMatchObject({ email: "a@b.co", source: "inline:/news/x", status: "pending" });
  });

  it("Supabase store creates a lead and an order", async () => {
    const r = recorder((url) => Response.json({ id: url.includes("b2b_leads") ? "lead-1" : "order-1" }, { status: 201 }));
    const db = createClient<Database>("https://proj.supabase.co", "k", { global: { fetch: r.fn }, auth: { persistSession: false } });
    const store = new SupabaseCaptureStore(db);
    const leadId = await store.createLead({ name: "Ada", email: "ada@x.co", service: "pr-basic", countries: ["ng"], source: "partners:/partners", utm: {} });
    const orderId = await store.createOrder({ lead_id: leadId, package_code: "pr-basic", amount_usd: 300, payment_ref: "INV-1" });
    expect([leadId, orderId]).toEqual(["lead-1", "order-1"]);
    expect(JSON.parse(r.calls[1]?.init?.body as string)).toMatchObject({ lead_id: "lead-1", amount_usd: 300, status: "pending" });
  });
});

describe("beehiiv adapter", () => {
  it("creates a subscription with source, UTM and country", async () => {
    const r = recorder(() => Response.json({ data: { id: "sub_123" } }, { status: 201 }));
    const res = await new BeehiivProvider("pub_1", "key", r.fn).subscribe({
      email: "a@b.co",
      country: "ke",
      source: "end-of-article:/news/x",
      utm: { utm_source: "twitter" },
      interests: ["price-alerts"],
    });
    expect(res).toEqual({ id: "sub_123" });
    expect(r.calls[0]?.url).toBe("https://api.beehiiv.com/v2/publications/pub_1/subscriptions");
    const body = JSON.parse(r.calls[0]?.init?.body as string);
    expect(body).toMatchObject({ email: "a@b.co", utm_source: "twitter", utm_campaign: "end-of-article", referring_site: "end-of-article:/news/x" });
    expect(body.custom_fields).toContainEqual({ name: "country", value: "ke" });
    const input = { email: "a@b.co", country: "ke", source: "inline:/", utm: {}, interests: [] };
    await expect(new BeehiivProvider("p", "k", recorder(() => new Response("", { status: 401 })).fn).subscribe(input)).rejects.toThrow(/401/);
  });
});

describe("notifier", () => {
  it("fans out to Telegram, Slack and email and reports failures without throwing", async () => {
    const r = recorder((url) => (url.includes("hooks.slack") ? new Response("", { status: 500 }) : Response.json({ ok: true })));
    const n = new LiveNotifier(
      { telegramToken: "T", telegramTeamChatId: "-100", slackWebhookUrl: "https://hooks.slack.com/x", resendApiKey: "R", emailFrom: "a@x.co", teamEmail: "team@x.co" },
      r.fn,
    );
    expect(n.channels).toEqual(["telegram", "slack", "email"]);
    const failures = await n.notifyTeam("New booking: PR\nmore");
    expect(failures).toEqual([expect.stringContaining("slack")]);
    const tg = r.calls.find((c) => c.url.includes("api.telegram.org"));
    expect(tg?.url).toBe("https://api.telegram.org/botT/sendMessage");
    expect(JSON.parse(tg?.init?.body as string)).toMatchObject({ chat_id: "-100", text: "New booking: PR\nmore" });
    const email = r.calls.find((c) => c.url.includes("resend"));
    expect(JSON.parse(email?.init?.body as string)).toMatchObject({ to: ["team@x.co"], subject: "New booking: PR" });
  });
});

describe("manual invoices", () => {
  it("creates a dated reference and plain-language instructions", async () => {
    const inv = await new ManualInvoiceProvider(() => new Date("2026-11-08T10:00:00Z")).createInvoice({ packageCode: "pr-basic", packageName: "Press release", amountUsd: 300, email: "a@b.co" });
    expect(inv.reference).toMatch(/^INV-20261108-[0-9A-Z]{6}$/);
    expect(inv.instructions).toContain("$300.00");
  });
});

describe("lead schema", () => {
  const valid = { name: "Ada Obi", email: "ADA@Startup.io", package: "launch-in-nigeria", countries: ["ng"], consent: "on", fax_number: "" };
  it("accepts a minimal booking", () => {
    expect(leadSchema.parse(valid)).toMatchObject({ email: "ada@startup.io", countries: ["ng"] });
  });
  it("rejects spam patterns and bad input", () => {
    expect(leadSchema.safeParse({ ...valid, fax_number: "123" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, message: "http://a http://b http://c http://d" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, package: "casino-ads" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, countries: ["us"] }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, consent: undefined }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, website: "javascript:alert(1)" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, telegram: "not a handle!" }).success).toBe(false);
  });
  it("reads multi-value checkboxes from FormData", () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ ...valid, countries: undefined })) if (typeof v === "string") f.append(k, v);
    f.append("countries", "ng");
    f.append("countries", "ke");
    const r = parseLeadForm(f);
    expect(r.success && r.data.countries).toEqual(["ng", "ke"]);
  });
});
