import { expect, test } from "@playwright/test";

const SLUG = "bitcoin-dollar-naira-buyers";

// CLAUDE.md §9: view-source must contain the article before any JS runs.
test("article HTML is fully server-rendered", async ({ request }) => {
  const res = await request.get(`/news/${SLUG}`, { headers: { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" } });
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("Bitcoin rises as the dollar softens: what it means for naira buyers");
  expect(html).toContain("The Bottom Line");
  expect(html).toContain("Local P2P prices often run above the official rate");
  expect(html).toContain("Two prices, not one"); // body heading
  expect(html).toContain('data-testid="source-list"');
  expect(html).toContain('data-testid="author-card"');
  expect(html).toContain('rel="canonical"');
  expect(html).toMatch(/<html[^>]+data-theme="system"/);
});

test("unknown article returns 404 with the site layout", async ({ request }) => {
  const res = await request.get("/news/does-not-exist");
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain("Page not found");
  expect(html).toContain('data-testid="ticker"');
});

test("theme cookie is applied server-side (no flash)", async ({ request }) => {
  const res = await request.get("/", { headers: { cookie: "hl_theme=ImRhcmsi" } }); // signed-free cookie value for "dark"
  expect(await res.text()).toMatch(/<html[^>]+data-theme="dark"/);
});

test("geo-IP sets the country on first visit; prices follow the currency", async ({ request }) => {
  const res = await request.get("/", { headers: { "x-vercel-ip-country": "KE" } });
  expect(res.headers()["set-cookie"]).toContain("hl_country=");
  const html = await res.text();
  expect(html).toContain("Ksh");
});

test("country switcher changes prices and theme toggle persists", async ({ page }) => {
  await page.goto(`/news/${SLUG}`);
  await expect(page.getByTestId("bottom-line")).toBeVisible();
  await page.getByTestId("country-switcher").selectOption("za");
  await expect(page.getByTestId("ticker")).toContainText("R");
  await expect(page.getByTestId("ticker")).not.toContainText("₦");

  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before ?? "");
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before ?? "");
});

test("no horizontal scroll at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(`/news/${SLUG}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
