import { describe, expect, it } from "vitest";
import { site } from "~/config/site";
import { absoluteUrl, buildMeta } from "~/lib/seo/meta";

const find = (tags: ReturnType<typeof buildMeta>, key: string, value: string) =>
  tags.find((t) => (t as Record<string, unknown>)[key] === value) as Record<string, string> | undefined;

describe("buildMeta", () => {
  it("applies the title template and canonical URL", () => {
    const tags = buildMeta({ title: "Bitcoin today", path: "/news/x", description: "d" });
    expect(tags).toContainEqual({ title: `Bitcoin today | ${site.name}` });
    expect(find(tags, "rel", "canonical")?.href).toBe(`${site.url}/news/x`);
    expect(find(tags, "property", "og:url")?.content).toBe(`${site.url}/news/x`);
    expect(find(tags, "name", "robots")?.content).toMatch(/^index/);
  });
  it("respects noindex and raw titles", () => {
    const tags = buildMeta({ title: "Home", rawTitle: true, path: "/", noindex: true });
    expect(tags).toContainEqual({ title: "Home" });
    expect(find(tags, "name", "robots")?.content).toBe("noindex, nofollow");
  });
  it("makes image URLs absolute", () => {
    expect(absoluteUrl("/a.svg")).toBe(`${site.url}/a.svg`);
    expect(absoluteUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });
});
