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
  // JSON-LD is in the raw HTML (CLAUDE.md §9).
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1] as string));
  const types = ld.flatMap((d) => (d["@graph"] ?? [d]).map((n: { "@type": string }) => n["@type"]));
  expect(types).toEqual(expect.arrayContaining(["NewsArticle", "BreadcrumbList"]));
  expect(html).toContain('property="og:image" content="');
  expect(html).toContain(`/og/article/${SLUG}.png`);
  expect(html).toContain('data-testid="share-buttons"');
  expect(html).toContain('data-testid="newsletter-inline"');
  expect(html).toContain('data-testid="newsletter-end-of-article"');
  expect(html).toContain('data-testid="related-stories"');
});

test("FAQ articles add FAQPage JSON-LD", async ({ request }) => {
  const html = await (await request.get("/news/fake-airdrop-sites-draining-wallets")).text();
  expect(html).toContain('"@type":"FAQPage"');
});

test("press posts are labelled, use Article JSON-LD and sponsored links", async ({ request }) => {
  const html = await (await request.get("/press/example-wallet-naira-onramp")).text();
  expect(html).toContain('data-testid="sponsored-label"');
  expect(html).toContain('"@type":"Article"');
  expect(html).not.toContain('"@type":"NewsArticle"');
  const external = [...html.matchAll(/<a [^>]*href="https:\/\/example\.com[^"]*"[^>]*>/g)].map((m) => m[0]);
  expect(external.length).toBeGreaterThan(0);
  for (const a of external) expect(a).toContain("sponsored nofollow");

  const noindexHtml = await (await request.get("/press/example-chain-ghana-hackathon")).text();
  expect(noindexHtml).toContain('content="noindex, nofollow"');
});

test("editorial pages never show sponsored posts", async ({ request }) => {
  for (const path of ["/", "/news", "/news?category=markets", "/news/bitcoin-dollar-naira-buyers", "/authors/amara-okafor"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain("example-wallet-naira-onramp");
    expect(html, path).not.toContain("Example Wallet adds");
  }
});

test("trust pages, author pages and SEO files respond", async ({ request }) => {
  for (const path of ["/about", "/standards", "/corrections", "/contact", "/privacy", "/terms", "/disclaimer", "/authors/thabo-nkosi", "/press", "/news"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(await res.text(), path).toContain("data-testid=\"newsletter-");
  }
  expect((await request.get("/robots.txt")).headers()["content-type"]).toContain("text/plain");
  expect((await request.get("/sitemap.xml")).headers()["content-type"]).toContain("application/xml");
  const og = await request.get("/og/article/bitcoin-dollar-naira-buyers.png");
  expect(og.headers()["content-type"]).toBe("image/png");
  expect(og.headers()["cache-control"]).toContain("max-age=86400");
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
  await page.waitForLoadState("networkidle");
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

test("news index filters by category and searches", async ({ page }) => {
  await page.goto("/news");
  await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Safety", exact: true }).click();
  await expect(page).toHaveURL(/category=safety/);
  await expect(page.getByTestId("news-list").getByRole("article")).toHaveCount(2);
  await page.getByLabel("Search news").fill("seed phrase");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("status")).toContainText("result");
});

test("newsletter form validates and reports status", async ({ page }) => {
  await page.goto(`/news/${SLUG}`);
  await page.waitForLoadState("networkidle");
  const box = page.getByTestId("newsletter-end-of-article");
  await box.getByLabel("Email address").fill("not-an-email");
  await box.getByRole("button", { name: "Subscribe" }).click();
  await expect(box.getByRole("alert")).toContainText(/email/i);
  await box.getByLabel("Email address").fill("reader@example.com");
  await box.getByRole("button", { name: "Subscribe" }).click();
  await expect(box.getByRole("alert")).toContainText(/open soon/i);
});

test("internal links in server-rendered bodies navigate client-side", async ({ page }) => {
  await page.goto("/news/fake-airdrop-sites-draining-wallets");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
  await page.getByTestId("bottom-line").scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: "run it through our scanner" }).click();
  await expect(page).toHaveURL(/\/safety\/scanner/);
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
});
