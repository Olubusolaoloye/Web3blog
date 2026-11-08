import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../../src/styles/globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ["dark", ':root[data-theme="dark"]'],
  ["light", ':root[data-theme="light"]'],
])("%s theme tokens meet WCAG AA", (_name, selector) => {
  const t = tokens(selector);
  it.each(["text", "text-muted", "signal-ink", "alert", "up", "warning"])("%s on bg and surface ≥ 4.5:1", (token) => {
    for (const bg of ["bg", "surface"]) {
      expect(contrast(t[token] as string, t[bg] as string), `${token} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("on-signal text on the signal fill ≥ 4.5:1", () => {
    expect(contrast(t["on-signal"] as string, t.signal as string)).toBeGreaterThanOrEqual(4.5);
  });
});

it("system-light block matches the explicit light block", () => {
  const light = tokens(':root[data-theme="light"]');
  const system = tokens(':root[data-theme="system"]');
  expect(system).toEqual(light);
});
