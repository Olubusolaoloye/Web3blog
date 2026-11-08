import { describe, expect, it } from "vitest";
import { fixtureSource } from "~/lib/content/fixture-source";
import { seedArticles, seedAuthors, seedCountries, seedDocuments } from "~/lib/content/fixtures/seed";
import { readingTimeMinutes, toPlainText } from "~/lib/content/reading-time";
import { articleBySlugQuery, articleListQuery } from "~/lib/sanity/queries";
import { bottomLineError, dimensionsFromAssetRef, heroImageError, isPublishableNews, sourcesError } from "../../studio/schemaTypes/rules";
import { toNdjson } from "../../studio/scripts/export-seed";

describe("seed content", () => {
  it("has 10 articles, 3 authors and the 4 launch countries", () => {
    expect(seedArticles).toHaveLength(10);
    expect(seedAuthors).toHaveLength(3);
    expect(seedCountries.map((c) => c.code)).toEqual(["NG", "KE", "ZA", "GH"]);
  });

  it("every article has a Bottom Line (1–3) and every news article has a source (rule 3)", () => {
    for (const a of seedArticles) {
      expect(bottomLineError(a.bottomLine), a.slug.current).toBe(true);
      if (a.type === "news") expect(isPublishableNews(a), a.slug.current).toBe(true);
    }
  });

  it("references resolve to seeded documents", () => {
    const ids = new Set(seedDocuments.map((d) => d._id));
    const refs = JSON.stringify(seedArticles).match(/"_ref":"([^"]+)"/g) ?? [];
    for (const r of refs) expect(ids.has(r.slice(8, -1)), r).toBe(true);
  });

  it("exports valid NDJSON with asset uploads instead of placeholders", () => {
    const lines = toNdjson().trim().split("\n");
    expect(lines).toHaveLength(seedDocuments.length);
    const docs = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
    const text = lines.join("\n");
    expect(text).not.toContain("_placeholder");
    expect(text).toContain('"_sanityAsset":"image@file://');
    expect(text).toContain('"_type":"sponsoredPost"');
    expect(text).toContain('"_type":"correction"');
    expect(docs.every((d) => typeof d._id === "string" && typeof d._type === "string")).toBe(true);
  });
});

describe("editorial rules (Studio validation)", () => {
  it("requires sources for news only", () => {
    expect(sourcesError("news", [])).not.toBe(true);
    expect(sourcesError("news", undefined)).not.toBe(true);
    expect(sourcesError("analysis", [])).toBe(true);
  });
  it("caps the Bottom Line at 3", () => {
    expect(bottomLineError([])).not.toBe(true);
    expect(bottomLineError(["a", "b", "c", "d"])).not.toBe(true);
    expect(bottomLineError(["  "])).not.toBe(true);
  });
  it("checks hero width from the asset id and requires alt text", () => {
    expect(dimensionsFromAssetRef("image-abc123-1600x900-jpg")).toEqual({ width: 1600, height: 900 });
    expect(heroImageError({ asset: { _ref: "image-abc123-800x450-jpg" }, alt: "x" })).toMatch(/1200px/);
    expect(heroImageError({ asset: { _ref: "image-abc123-1600x900-jpg" } })).toMatch(/Alt text/);
    expect(heroImageError({ asset: { _ref: "image-abc123-1600x900-jpg" }, alt: "Chart" })).toBe(true);
    expect(heroImageError(undefined)).toMatch(/required/);
  });
});

describe("fixture content source", () => {
  it("returns a full article with resolved authors and sources", async () => {
    const a = await fixtureSource.getArticle("bitcoin-dollar-naira-buyers");
    expect(a?.authors[0]?.name).toBe("Amara Okafor");
    expect(a?.editor?.name).toBe("Wanjiru Kamau");
    expect(a?.sources.length).toBeGreaterThan(0);
    expect(a?.countries).toEqual(["ng"]);
    expect(a?.category?.slug).toBe("markets");
    expect(await fixtureSource.getArticle("missing")).toBeNull();
  });

  it("lists newest first and filters by type", async () => {
    const list = await fixtureSource.listArticles({ limit: 5 });
    expect(list.items).toHaveLength(5);
    expect(list.total).toBe(10);
    const dates = list.items.map((a) => a.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    const safety = await fixtureSource.listArticles({ type: "safety" });
    expect(safety.items.every((a) => a.type === "safety")).toBe(true);
    expect(safety.total).toBe(2);
  });

  it("filters by category, author, country, query and paginates", async () => {
    expect((await fixtureSource.listArticles({ category: "regulation" })).total).toBe(3);
    expect((await fixtureSource.listArticles({ author: "thabo-nkosi" })).total).toBe(4);
    expect((await fixtureSource.listArticles({ country: "gh" })).items.map((a) => a.slug)).toContain("ghana-digital-asset-approach");
    expect((await fixtureSource.listArticles({ query: "SEED PHRASE" })).items.map((a) => a.slug)).toContain("what-is-a-seed-phrase");
    const page2 = await fixtureSource.listArticles({ limit: 4, offset: 8 });
    expect(page2.items).toHaveLength(2);
    expect(page2.total).toBe(10);
  });

  it("finds related stories by shared tags, category and country", async () => {
    const a = await fixtureSource.getArticle("fake-airdrop-sites-draining-wallets");
    const related = await fixtureSource.getRelatedArticles(a!, 3);
    expect(related[0]?.slug).toBe("telegram-investment-manager-scam");
    expect(related).toHaveLength(3);
    // Articles with few overlaps are topped up with the latest stories.
    const lonely = await fixtureSource.getArticle("fsca-licence-check-south-africa");
    const filled = await fixtureSource.getRelatedArticles(lonely!, 3);
    expect(filled).toHaveLength(3);
    expect(new Set(filled.map((f) => f.slug)).size).toBe(3);
  });

  it("lists authors, categories, corrections and sponsored posts", async () => {
    expect(await fixtureSource.listAuthors()).toHaveLength(3);
    expect((await fixtureSource.listCategories()).map((c) => c.slug)).toContain("safety");
    const [correction] = await fixtureSource.listCorrections();
    expect(correction?.article.slug).toBe("ethereum-upgrade-everyday-users");
    expect(await fixtureSource.listSponsoredPosts()).toHaveLength(2);
    expect(await fixtureSource.listSponsoredPosts({ includeNoindex: false })).toHaveLength(1);
    expect((await fixtureSource.getSponsoredPost("example-chain-ghana-hackathon"))?.noindex).toBe(true);
  });
});

describe("GROQ editorial queries", () => {
  it("select only article documents, never sponsoredPost", () => {
    for (const q of [articleListQuery, articleBySlugQuery] as string[]) {
      expect(q).toContain('_type == "article"');
      expect(q).not.toContain("sponsoredPost");
    }
  });
});

describe("reading time", () => {
  it("counts words in text blocks only", () => {
    const blocks = [
      { _type: "block", _key: "a", children: [{ _type: "span", _key: "s", text: "word ".repeat(440) }], markDefs: [], style: "normal" },
      { _type: "priceChip", _key: "b", coinId: "bitcoin" },
    ];
    expect(toPlainText(blocks).split(/\s+/).filter(Boolean)).toHaveLength(440);
    expect(readingTimeMinutes(blocks)).toBe(2);
    expect(readingTimeMinutes([])).toBe(1);
  });
});
