/**
 * CLAUDE.md §7.11 / rule 2: sponsored posts never appear in editorial lists, related stories or NewsArticle JSON-LD.
 */
import { describe, expect, it } from "vitest";
import { fixtureSource } from "~/lib/content/fixture-source";
import { seedArticles, seedSponsoredPosts } from "~/lib/content/fixtures/seed";
import type { Article, ListArticlesOptions } from "~/lib/content/types";
import * as queries from "~/lib/sanity/queries";

const sponsoredSlugs = new Set(seedSponsoredPosts.map((p) => p.slug.current));
const sponsoredTitles = seedSponsoredPosts.map((p) => p.title);

describe("sponsored posts never appear in editorial lists", () => {
  const filters: ListArticlesOptions[] = [
    {},
    { limit: 1000 },
    { category: "markets" },
    { type: "news" },
    { type: "analysis" },
    { country: "ng" },
    { country: "gh" },
    { author: "amara-okafor" },
    { author: "wanjiru-kamau" },
    { query: "Example" },
    { query: "naira" },
    { since: "2000-01-01T00:00:00Z" },
  ];

  it.each(filters.map((f) => [JSON.stringify(f), f] as const))("listArticles(%s)", async (_label, filter) => {
    const { items } = await fixtureSource.listArticles(filter);
    for (const a of items) {
      expect(a.docType).toBe("article");
      expect(sponsoredSlugs.has(a.slug)).toBe(false);
    }
  });

  it("the sponsored fixtures really do overlap editorial filters (so the test is meaningful)", () => {
    expect(seedSponsoredPosts.some((p) => p.category._ref === "category.markets")).toBe(true);
    expect(seedSponsoredPosts.some((p) => p.countries.some((c) => c._ref === "country.ng"))).toBe(true);
  });

  it("related stories never include sponsored posts", async () => {
    for (const seed of seedArticles) {
      const article = (await fixtureSource.getArticle(seed.slug.current)) as Article;
      const related = await fixtureSource.getRelatedArticles(article, 20);
      expect(related.every((r) => r.docType === "article" && !sponsoredSlugs.has(r.slug))).toBe(true);
      expect(related.some((r) => r.slug === article.slug)).toBe(false);
    }
  });

  it("getArticle does not resolve sponsored slugs (they only render under /press)", async () => {
    for (const slug of sponsoredSlugs) expect(await fixtureSource.getArticle(slug)).toBeNull();
  });

  it("GROQ editorial queries only select article documents", () => {
    for (const q of [queries.articleListQuery, queries.articleBySlugQuery, queries.autoRelatedQuery, queries.pickedRelatedQuery]) {
      expect(q).toContain('_type == "article"');
      expect(q).not.toContain("sponsoredPost");
    }
    expect(queries.sponsoredListQuery).toContain('_type == "sponsoredPost"');
  });

  it("sponsored titles never leak into editorial search results", async () => {
    for (const title of sponsoredTitles) {
      const { items } = await fixtureSource.listArticles({ query: title.split(" ")[1] });
      expect(items.map((i) => i.title)).not.toContain(title);
    }
  });
});
