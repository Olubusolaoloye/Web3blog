import { describe, expect, it } from "vitest";
import { site } from "~/config/site";
import { fixtureSource } from "~/lib/content/fixture-source";
import { seedArticles } from "~/lib/content/fixtures/seed";
import type { Article } from "~/lib/content/types";
import {
  breadcrumbJsonLd,
  datasetJsonLd,
  faqJsonLd,
  graph,
  newsArticleJsonLd,
  organizationJsonLd,
  personJsonLd,
  sponsoredArticleJsonLd,
  websiteJsonLd,
} from "~/lib/seo/jsonld";
import { nodesOf, validateArticle, validateBreadcrumbs, validateFaq } from "../helpers/rich-results";

describe("NewsArticle JSON-LD passes the local Rich Results checks", () => {
  it.each(seedArticles.map((a) => a.slug.current))("%s", async (slug) => {
    const article = (await fixtureSource.getArticle(slug)) as Article;
    const node = newsArticleJsonLd(article);
    expect(validateArticle(node)).toEqual([]);
    expect(node.mainEntityOfPage).toMatchObject({ "@id": `${site.url}/news/${slug}` });
  });

  it("catches a broken article (the validator itself works)", () => {
    expect(
      validateArticle({ "@type": "NewsArticle", headline: "x".repeat(120), image: ["/rel.png"], datePublished: "2026-01-01", author: [{ "@type": "Person", name: "A" }] }),
    ).toEqual(
      expect.arrayContaining([
        "headline must be at most 110 characters",
        "image must be one or more absolute URLs",
        "datePublished must be ISO 8601 with a timezone",
        "author.url must be an absolute URL",
        "publisher.name is required",
      ]),
    );
  });

  it("truncates long headlines to 110 characters", async () => {
    const a = (await fixtureSource.getArticle("bitcoin-dollar-naira-buyers")) as Article;
    const node = newsArticleJsonLd({ ...a, title: "y".repeat(150) });
    expect((node.headline as string).length).toBe(110);
  });
});

describe("sponsored content JSON-LD", () => {
  it("uses Article (not NewsArticle) with a sponsor", async () => {
    const post = await fixtureSource.getSponsoredPost("example-wallet-naira-onramp");
    const node = sponsoredArticleJsonLd(post!);
    expect(node["@type"]).toBe("Article");
    expect(validateArticle(node, "Article")).toEqual([]);
    expect(node.sponsor).toEqual({ "@type": "Organization", name: "Example Wallet Co." });
  });

  it("refuses to build NewsArticle for a sponsored post", async () => {
    const post = await fixtureSource.getSponsoredPost("example-wallet-naira-onramp");
    expect(() => newsArticleJsonLd(post as unknown as Article)).toThrow(/editorial/);
  });
});

describe("other builders", () => {
  it("breadcrumbs", () => {
    const node = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "News", path: "/news" },
    ]);
    expect(validateBreadcrumbs(node)).toEqual([]);
    expect(validateBreadcrumbs(breadcrumbJsonLd([{ name: "Home", path: "/" }]))).not.toEqual([]);
  });

  it("FAQPage", async () => {
    const a = await fixtureSource.getArticle("fake-airdrop-sites-draining-wallets");
    expect(validateFaq(faqJsonLd(a!.faq!))).toEqual([]);
  });

  it("Organization and WebSite with SearchAction", () => {
    const org = organizationJsonLd();
    expect(org.name).toBe(site.name);
    expect(org.logo).toMatchObject({ url: `${site.url}/logo.svg` });
    const web = websiteJsonLd();
    expect(web.potentialAction).toMatchObject({
      "@type": "SearchAction",
      target: { urlTemplate: `${site.url}/news?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    });
  });

  it("Person and Dataset", async () => {
    const author = await fixtureSource.getAuthor("thabo-nkosi");
    const p = personJsonLd(author!);
    expect(p).toMatchObject({ "@type": "Person", name: "Thabo Nkosi", url: `${site.url}/authors/thabo-nkosi` });
    const d = datasetJsonLd({ name: "Report", description: "D", path: "/research/r", downloadUrl: "/r.pdf" });
    expect(d).toMatchObject({ "@type": "Dataset", url: `${site.url}/research/r`, distribution: { contentUrl: `${site.url}/r.pdf` } });
  });

  it("graph wraps nodes with a schema.org context", () => {
    const g = graph(organizationJsonLd(), websiteJsonLd());
    expect(g["@context"]).toBe("https://schema.org");
    expect(nodesOf(g)).toHaveLength(2);
  });
});
