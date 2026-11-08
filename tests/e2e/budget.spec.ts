import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const BUDGET_KB = 120; // CLAUDE.md §9: article-route JS ≤ 120 KB gzip

// Sums every script the article page preloads (all JS needed to hydrate it), gzipped one file at a time like HTTP does.
test("article route JS stays within the 120 KB gzip budget", async ({ request }) => {
  const html = await (await request.get("/news/bitcoin-dollar-naira-buyers")).text();
  const files = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1] as string);
  expect(files.length).toBeGreaterThan(0);
  const sizes = files.map((f) => gzipSync(readFileSync(resolve("build/client", `.${f}`)), { level: 9 }).length);
  const totalKb = sizes.reduce((a, b) => a + b, 0) / 1024;
  console.log(`article JS: ${totalKb.toFixed(1)} KB gzip across ${files.length} files`);
  expect(totalKb).toBeLessThanOrEqual(BUDGET_KB);
});
