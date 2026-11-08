import { describe, expect, it } from "vitest";
import { site } from "~/config/site";
import { newsSitemap, sitemapIndex, urlset, xmlEscape } from "~/lib/seo/sitemap";
import { llmsTxt } from "~/app/routes/llms[.]txt";
import { robotsTxt } from "~/app/routes/robots[.]txt";
import { loader as newsSitemapLoader } from "~/app/routes/news-sitemap[.]xml";
import { loader as sitemapIndexLoader } from "~/app/routes/sitemap[.]xml";
import { loader as sitemapLoader } from "~/app/routes/sitemaps.$name";

const callSitemap = (name: string) =>
  sitemapLoader({ params: { name }, request: new Request(`http://x/sitemaps/${name}`), context: {} } as never) as Promise<Response>;

describe("sitemap XML", () => {
  it("escapes XML", () => {
    expect(xmlEscape(`a&b<c>"d'`)).toBe("a&amp;b&lt;c&gt;&quot;d&apos;");
    expect(urlset([{ path: "/news?category=a&b" }])).toContain("<loc>" + site.url + "/news?category=a&amp;b</loc>");
  });

  it("index lists child sitemaps", async () => {
    const xml = await (sitemapIndexLoader() as Response).text();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(`${site.url}/sitemaps/articles.xml`);
    expect(xml).toContain(`${site.url}/sitemaps/pages.xml`);
    expect(sitemapIndex(["/a.xml"])).toContain(`<loc>${site.url}/a.xml</loc>`);
  });

  it("articles sitemap lists editorial articles only", async () => {
    const xml = await (await callSitemap("articles.xml")).text();
    expect(xml.match(/<url>/g)).toHaveLength(10);
    expect(xml).not.toContain("/press/");
    expect(xml).toContain("<lastmod>2026-11-08T09:10:00Z</lastmod>");
  });

  it("pages sitemap includes press posts except noindex ones", async () => {
    const xml = await (await callSitemap("pages.xml")).text();
    expect(xml).toContain("/press/example-wallet-naira-onramp");
    expect(xml).not.toContain("/press/example-chain-ghana-hackathon");
    expect(xml).toContain("/authors/amara-okafor");
    expect(xml).toContain(`${site.url}/standards`);
  });

  it("unknown sitemap is 404", async () => {
    expect((await callSitemap("nope.xml")).status).toBe(404);
  });

  it("news sitemap has news: tags and only recent articles", async () => {
    const xml = newsSitemap([{ path: "/news/a", title: "A & B", publishedAt: "2026-11-08T07:30:00Z" }]);
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain(`<news:name>${site.name}</news:name>`);
    expect(xml).toContain("<news:title>A &amp; B</news:title>");

    const live = await (await newsSitemapLoader()).text();
    const dates = [...live.matchAll(/<news:publication_date>([^<]+)</g)].map((m) => Date.parse(m[1] as string));
    for (const d of dates) expect(Date.now() - d).toBeLessThanOrEqual(2 * 24 * 60 * 60 * 1000);
  });
});

describe("robots.txt and llms.txt", () => {
  it("robots disallows private areas and points to sitemaps", () => {
    const txt = robotsTxt();
    expect(txt).toContain("Allow: /");
    for (const p of ["/admin", "/account", "/api"]) expect(txt).toContain(`Disallow: ${p}`);
    expect(txt).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  });

  it("llms.txt describes the brand and links standards and research", () => {
    const txt = llmsTxt();
    expect(txt.startsWith(`# ${site.name}`)).toBe(true);
    expect(txt).toContain(`${site.url}/standards`);
    expect(txt).toContain(`${site.url}/research`);
  });
});
