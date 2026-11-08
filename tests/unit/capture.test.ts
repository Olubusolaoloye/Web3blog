import { describe, expect, it } from "vitest";
import { captureSource, subscribeSchema } from "~/lib/capture/schema";
import { splitBody } from "~/lib/content/split";
import type { BodyBlock } from "~/lib/content/types";

describe("subscribe schema", () => {
  const base = { email: " Reader@Example.com ", country: "ke", source: "inline:/news/a", website: "" };
  it("normalises email and accepts launched countries", () => {
    const r = subscribeSchema.parse(base);
    expect(r.email).toBe("reader@example.com");
    expect(r.experience).toBeUndefined();
  });
  it("rejects bad email, unknown country and filled honeypot", () => {
    expect(subscribeSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ ...base, country: "us" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });
  it("builds source from component + path", () => {
    expect(captureSource("end-of-article", "/news/x")).toBe("end-of-article:/news/x");
  });
});

describe("splitBody", () => {
  const p = (k: string): BodyBlock => ({ _type: "block", _key: k, style: "normal", markDefs: [], children: [] });
  const li = (k: string): BodyBlock => ({ ...p(k), listItem: "bullet", level: 1 }) as BodyBlock;
  it("splits at ~40%", () => {
    const [a, b] = splitBody(["1", "2", "3", "4", "5"].map(p));
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(3);
  });
  it("never splits inside a list", () => {
    const [a] = splitBody([p("1"), li("2"), li("3"), li("4"), p("5"), p("6")]);
    expect(a.map((x) => x._key)).toEqual(["1", "2", "3", "4"]);
  });
  it("leaves short bodies whole", () => {
    expect(splitBody([p("1"), p("2")])[1]).toEqual([]);
  });
});
