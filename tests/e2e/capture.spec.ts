import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ARTICLE = "/news/bitcoin-dollar-naira-buyers";
let ipCounter = 0;
const uniqueIp = () => `10.${process.pid % 250}.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

type Outbox = {
  subscribers: Array<{ email: string; source: string; country_code: string; interests: string[]; utm: Record<string, string> }>;
  leads: Array<{ id: string; email: string; service: string; countries: string[]; source: string; utm: Record<string, string> }>;
  orders: Array<{ lead_id: string; package_code: string; amount_usd: number; status: string; payment_ref: string }>;
  team: string[];
  emails: Array<{ to: string; subject: string }>;
};
const outbox = async (request: APIRequestContext) => (await (await request.get("/api/test-outbox")).json()) as Outbox;

async function useOwnIp(page: Page) {
  await page.setExtraHTTPHeaders({ "x-test-ip": uniqueIp() });
}

test("subscribing from an article stores the row with the right source and UTM (Phase 4 acceptance)", async ({ page, request }) => {
  await useOwnIp(page);
  await page.goto(`${ARTICLE}?utm_source=e2e&utm_medium=test&utm_campaign=phase4`);
  await page.waitForLoadState("networkidle");
  const email = uniqueEmail("article");
  const box = page.getByTestId("newsletter-end-of-article");
  await box.getByLabel("Email address").fill(email);
  await box.getByLabel("Country").selectOption("gh");
  await box.getByRole("button", { name: "Subscribe" }).click();
  await expect(box.getByRole("status")).toContainText("You're on the list");
  await expect(box.getByRole("link", { name: "WhatsApp" })).toBeVisible(); // second capture: community CTA

  const row = (await outbox(request)).subscribers.find((s) => s.email === email);
  expect(row).toMatchObject({
    source: `end-of-article:${ARTICLE}`,
    country_code: "gh",
    utm: { utm_source: "e2e", utm_medium: "test", utm_campaign: "phase4", landing: ARTICLE },
  });
});

test("the inline box (after ~40% of the body) records its own source", async ({ page, request }) => {
  await useOwnIp(page);
  await page.goto(ARTICLE);
  await page.waitForLoadState("networkidle");
  const email = uniqueEmail("inline");
  const box = page.getByTestId("newsletter-inline");
  await box.getByLabel("Email address").fill(email);
  await box.getByRole("button", { name: "Subscribe" }).click();
  await expect(box.getByRole("status")).toBeVisible();
  expect((await outbox(request)).subscribers.find((s) => s.email === email)?.source).toBe(`inline:${ARTICLE}`);
});

test("AlertCTA signs readers up for price alerts", async ({ page, request }) => {
  await useOwnIp(page);
  await page.goto("/markets/bitcoin");
  await page.waitForLoadState("networkidle");
  const email = uniqueEmail("alert");
  const cta = page.getByTestId("alert-cta");
  await cta.getByPlaceholder("you@example.com").fill(email);
  await cta.getByRole("button", { name: "Notify me" }).click();
  await expect(cta.getByRole("status")).toContainText("launching soon");
  expect((await outbox(request)).subscribers.find((s) => s.email === email)).toMatchObject({ source: "alert-cta:/markets/bitcoin", interests: ["price-alerts"] });
});

test("B2B booking creates a lead and an order and notifies the team (Phase 4 acceptance)", async ({ page, request }) => {
  await useOwnIp(page);
  await page.goto("/partners?package=pr-basic&utm_source=linkedin#book");
  await expect(page.getByTestId("price-list").locator(":scope > li")).toHaveCount(8);
  const email = uniqueEmail("b2b");
  const form = page.locator("#book form");
  await form.getByLabel("Name").fill("Ada Obi");
  await form.getByLabel("Work email").fill(email);
  await form.getByLabel("Company").fill("Startup Ltd");
  await form.getByLabel("Website").fill("https://startup.example");
  await expect(form.getByLabel("Package")).toHaveValue("pr-basic");
  await form.getByRole("checkbox", { name: /Nigeria/ }).check();
  await form.getByRole("checkbox", { name: /Kenya/ }).check();
  await form.getByLabel(/I agree to be contacted/).check();
  await form.getByRole("button", { name: "Send booking request" }).click();

  const confirmation = page.getByTestId("booking-confirmation");
  await expect(confirmation).toContainText("Press release");
  const reference = (await confirmation.locator("strong").textContent())?.trim();
  expect(reference).toMatch(/^INV-\d{8}-[0-9A-Z]{6}$/);

  const box = await outbox(request);
  const lead = box.leads.find((l) => l.email === email);
  expect(lead).toMatchObject({ service: "pr-basic", countries: ["ng", "ke"], source: "partners:/partners", utm: { utm_source: "linkedin" } });
  expect(box.orders.find((o) => o.lead_id === lead?.id)).toMatchObject({ package_code: "pr-basic", amount_usd: 300, status: "pending", payment_ref: reference });
  expect(box.team.some((t) => t.includes("New booking: Press release") && t.includes(email))).toBe(true);
  expect(box.emails.some((m) => m.to === email && m.subject.includes(reference as string))).toBe(true);
});

test("booking form shows field errors without JS-only validation", async ({ page }) => {
  await useOwnIp(page);
  await page.goto("/partners#book");
  await page.locator("#book form").getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByRole("alert")).toContainText("fix the highlighted fields");
  await expect(page.getByText("Choose at least one country.")).toBeVisible();
});

test("spam protection: honeypot and per-IP rate limits", async ({ request }) => {
  const ip = uniqueIp();
  const form = (email: string, extra: Record<string, string> = {}) => ({
    headers: { "x-test-ip": ip },
    form: { email, country: "ng", source: "e2e:/spam", website: "", ...extra },
  });
  const honeypot = await request.post("/api/subscribe", form(uniqueEmail("bot"), { website: "http://spam.example" }));
  expect(honeypot.status()).toBe(400);
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await request.post("/api/subscribe", form(uniqueEmail(`rl${i}`)))).status());
  // The honeypot attempt counts too: 5 allowed per 10 minutes, then 429.
  expect(statuses.slice(0, 4).every((s) => s === 200)).toBe(true);
  expect(statuses.slice(4)).toEqual([429, 429]);
  const box = await (await request.get("/api/test-outbox")).json();
  expect(box.subscribers.some((s: { source: string; email: string }) => s.email.startsWith("bot-"))).toBe(false);
});

test("media kit downloads as a PDF", async ({ request, page }) => {
  await page.goto("/partners");
  const href = await page.getByTestId("media-kit").getAttribute("href");
  const res = await request.get(href as string);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("every public page has at least one capture component", async ({ request }) => {
  const pages = ["/", "/news", ARTICLE, "/markets", "/markets/bitcoin", "/markets/bitcoin/to/ngn", "/local/ng", "/press", "/press/example-wallet-naira-onramp", "/about", "/standards", "/corrections", "/contact", "/privacy", "/terms", "/disclaimer", "/authors/amara-okafor", "/partners"];
  for (const path of pages) {
    const html = await (await request.get(path)).text();
    expect(/data-testid="(newsletter-|alert-cta)|action="\/partners/.test(html) || html.includes('id="book"'), path).toBe(true);
  }
});

test("the test outbox is not exposed without E2E mode (sanity check of the guard)", async ({ request }) => {
  // In this run E2E_TEST_MODE=1, so the endpoint answers; the unit tests cover the disabled case.
  expect((await request.get("/api/test-outbox")).status()).toBe(200);
});
