import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { site } from "~/config/site";
import { OG_HEIGHT, OG_WIDTH, ogTree, renderOgPng } from "~/lib/seo/og.server";

const input = {
  kicker: "Markets",
  title: "Bitcoin rises as the dollar softens: what it means for naira buyers",
  subtitle: "Bitcoin's dollar price is up on the day, but naira buyers also need to watch the FX rate.",
};

describe("OG images", () => {
  it("renders a 1200×630 PNG", async () => {
    const png = Buffer.from(await renderOgPng(input));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH);
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT);
    // Set OG_OUT=<dir> to write the image for a visual check.
    if (process.env.OG_OUT) writeFileSync(`${process.env.OG_OUT}/og-article.png`, png);
  }, 20_000);

  it("includes the title, first Bottom Line bullet and brand", () => {
    const text = JSON.stringify(ogTree(input));
    expect(text).toContain(input.title);
    expect(text).toContain(input.subtitle);
    expect(text).toContain(site.name);
  });

  it("truncates very long titles", () => {
    const text = JSON.stringify(ogTree({ title: "x".repeat(300) }));
    expect(text).toContain("…");
    expect(text).not.toContain("x".repeat(121));
  });
});
