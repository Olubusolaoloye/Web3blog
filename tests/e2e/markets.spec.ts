import { expect, test } from "@playwright/test";

test("markets table: top 200, sortable, paginated, in local currency", async ({ page }) => {
  await page.goto("/markets");
  const rows = page.getByTestId("markets-table").locator("tbody tr");
  await expect(rows).toHaveCount(50);
  await expect(rows.first()).toContainText("Bitcoin");
  await expect(rows.first()).toContainText("₦");
  await expect(page.getByTestId("sample-data-notice")).toBeVisible();

  await page.getByRole("link", { name: /^24h/ }).click();
  await expect(page).toHaveURL(/sort=change24h&dir=desc/);
  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 4")).toBeVisible();
});

test("coin page: price, chart ranges, local prices, alert CTA, risk badge for tokens", async ({ page }) => {
  await page.goto("/markets/tether");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tether");
  await expect(page.getByTestId("local-prices").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("alert-cta")).toBeVisible();
  await expect(page.getByRole("link", { name: /Scan this token/ })).toHaveAttribute("href", /\/safety\/scanner\?chain=ethereum&address=0x/);
  // the interactive chart replaces the SVG after hydration
  await expect(page.getByTestId("price-chart")).toBeVisible();
  await page.getByRole("navigation", { name: "Chart range" }).getByRole("link", { name: "1Y" }).click();
  await expect(page).toHaveURL(/range=1y/);
  await expect(page.getByTestId("price-chart")).toBeVisible();
});

test("BTC has no contract, so no risk badge", async ({ request }) => {
  const html = await (await request.get("/markets/bitcoin")).text();
  expect(html).not.toContain("Scan this token");
  expect(html).toContain("<svg"); // server-rendered chart
});

test("converter page: unique local content; thin or invalid pairs 404", async ({ page, request }) => {
  await page.goto("/markets/bitcoin/to/ngn");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bitcoin to Nigerian naira (BTC to NGN)");
  await expect(page.getByTestId("converter-rate")).toContainText("₦");
  await expect(page.getByTestId("p2p-comparison")).toContainText("vs official");
  await expect(page.getByRole("heading", { name: "How people in Nigeria buy BTC" })).toBeVisible();
  await expect(page.getByText(/P2P marketplace or an SEC-registered exchange/)).toBeVisible();
  for (const path of ["/markets/bitcoin/to/usd", "/markets/bitcoin/to/NGN", "/markets/sample-coin-51/to/ngn", "/markets/bitcoin/to/inr"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("local hub renders prices, P2P card, regulation, exchanges and stories", async ({ page }) => {
  await page.goto("/local/ke");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Crypto in Kenya");
  await expect(page.getByTestId("price-board").locator("li")).toHaveCount(5);
  await expect(page.getByTestId("price-board")).toContainText("Ksh");
  await expect(page.getByTestId("p2p-card")).toContainText("Last updated");
  await expect(page.getByTestId("regulation")).toContainText("Last reviewed");
  await expect(page.getByTestId("recommended-exchanges")).toContainText("Sample Exchange KE");
  await expect(page.getByRole("link", { name: "Join on WhatsApp" })).toBeVisible();
  expect((await page.request.get("/local/in")).status()).toBe(404);
});

test("prices refresh in the browser through /api/prices (never CoinGecko)", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/coingecko|exchangerate|er-api/.test(r.url())) external.push(r.url());
  });
  await page.clock.install();
  await page.route("**/api/prices?**", async (route) => {
    const url = new URL(route.request().url());
    const ids = (url.searchParams.get("ids") ?? "").split(",");
    await route.fulfill({
      json: { currency: "NGN", sample: true, quotes: ids.map((id) => ({ id, symbol: id === "bitcoin" ? "BTC" : id.toUpperCase(), name: id, currency: "NGN", price: id === "bitcoin" ? 123_000_000 : 1, change24h: 9.9 })) },
    });
  });
  await page.goto("/news/bitcoin-dollar-naira-buyers");
  await page.waitForLoadState("networkidle");
  const chip = page.getByRole("complementary", { name: "Prices mentioned" }).getByTestId("price-chip").first();
  await expect(chip).toContainText("₦98.3M");
  await page.clock.runFor(61_000);
  await expect(chip).toContainText("₦123M");
  await expect(page.getByTestId("ticker")).toContainText("₦123M");
  expect(external).toEqual([]);
});

test("price chip: first tap shows the mini chart, second tap opens the coin", async ({ page }) => {
  await page.goto("/news/bitcoin-dollar-naira-buyers");
  await page.waitForLoadState("networkidle");
  const aside = page.getByRole("complementary", { name: "Prices mentioned" });
  await aside.getByTestId("price-chip").first().tap();
  await expect(aside.getByTestId("price-chip-chart").first()).toBeVisible();
  await expect(page).toHaveURL(/\/news\//);
  await aside.getByTestId("price-chip").first().tap();
  await expect(page).toHaveURL(/\/markets\/bitcoin$/);
});

test("price chip shows the mini chart on hover (desktop)", async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false });
  await page.goto(`${baseURL}/news/bitcoin-dollar-naira-buyers`);
  const aside = page.getByRole("complementary", { name: "Prices mentioned" });
  await aside.getByTestId("price-chip").first().hover();
  await expect(aside.getByTestId("price-chip-chart").first()).toBeVisible();
  await page.close();
});

test("first visit is never CDN-cached; repeat visits are", async ({ request }) => {
  const first = await request.get("/markets", { headers: { cookie: "" } });
  expect(first.headers()["cache-control"]).toBe("private, no-store");
  const repeat = await request.get("/markets", { headers: { cookie: "hl_country=ImtlIg==" } });
  expect(repeat.headers()["cache-control"]).toContain("s-maxage=60, stale-while-revalidate=300");
  expect(repeat.headers()["netlify-vary"]).toBe("cookie=hl_country|hl_theme");
});

// Regression guard: server and browser Intl output must agree, or React logs hydration errors (#418).
test("key pages hydrate without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const path of ["/", "/news/bitcoin-dollar-naira-buyers", "/markets", "/markets/bitcoin", "/markets/bitcoin/to/zar", "/local/gh"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});
