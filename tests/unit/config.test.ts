import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getCountry, getCountryOrDefault, launchedCountries } from "~/config/countries";
import { isEnabled } from "~/config/flags";
import { site } from "~/config/site";
import { detectCountryFromHeaders } from "~/lib/geo";
import { safeRedirectPath } from "~/lib/redirect";
import { nextTheme, parseTheme } from "~/lib/theme";

describe("countries", () => {
  it("launches with ng, ke, za, gh", () => {
    expect(launchedCountries.map((c) => c.code)).toEqual(["ng", "ke", "za", "gh"]);
    expect(launchedCountries.map((c) => c.currency)).toEqual(["NGN", "KES", "ZAR", "GHS"]);
  });
  it("looks up case-insensitively and ignores unlaunched markets", () => {
    expect(getCountry("KE")?.currency).toBe("KES");
    expect(getCountry("in")).toBeUndefined();
    expect(getCountryOrDefault("zz").code).toBe("ng");
  });
});

describe("geo detection", () => {
  it("reads Vercel, Cloudflare and Netlify headers", () => {
    expect(detectCountryFromHeaders(new Headers({ "x-vercel-ip-country": "ZA" }))?.code).toBe("za");
    expect(detectCountryFromHeaders(new Headers({ "cf-ipcountry": "GH" }))?.code).toBe("gh");
    const nf = btoa(JSON.stringify({ country: { code: "KE" } }));
    expect(detectCountryFromHeaders(new Headers({ "x-nf-geo": nf }))?.code).toBe("ke");
    expect(detectCountryFromHeaders(new Headers({ "x-nf-geo": "not-base64!" }))).toBeUndefined();
    expect(detectCountryFromHeaders(new Headers({ "cf-ipcountry": "US" }))).toBeUndefined();
    expect(detectCountryFromHeaders(new Headers())).toBeUndefined();
  });
});

describe("theme", () => {
  it("parses and cycles", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("neon")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("dark")).toBe("system");
  });
});

describe("safeRedirectPath", () => {
  it("only allows same-site paths", () => {
    expect(safeRedirectPath("/news/x?y=1")).toBe("/news/x?y=1");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
  });
});

describe("flags", () => {
  it("defaults risky features off and allows overrides", () => {
    expect(isEnabled("whatsappAlerts")).toBe(false);
    expect(isEnabled("exitIntent", { exitIntent: true })).toBe(true);
  });
});

describe("brand name lives only in site.ts (rule 8)", () => {
  const root = resolve(import.meta.dirname, "../..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (["node_modules", "dist", ".sanity", "seed"].includes(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(name)) files.push(p);
    }
  };
  walk(join(root, "src"));
  walk(join(root, "studio"));

  it("no other source file contains the brand name", () => {
    const offenders = files
      .filter((f) => !f.endsWith(join("src", "config", "site.ts")))
      .filter((f) => readFileSync(f, "utf8").includes(site.name));
    expect(offenders).toEqual([]);
  });
});
