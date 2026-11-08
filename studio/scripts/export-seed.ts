/**
 * Exports the seed fixtures (src/lib/content/fixtures/seed.ts) to NDJSON for `sanity dataset import`.
 * Run with Node 22.18+ (built-in TypeScript type stripping):  pnpm --filter studio seed:export
 *
 * Fixture-only `_placeholder` image paths become `_sanityAsset: image@file://…` so the importer uploads them.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedDocuments } from "../../src/lib/content/fixtures/seed.ts";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../../public");
const outFile = resolve(here, "../seed/seed.ndjson");

function transform(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transform);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj._type === "image" && typeof obj._placeholder === "string") {
      const { _placeholder, width: _w, height: _h, ...rest } = obj;
      return { ...rest, _sanityAsset: `image@${pathToFileURL(resolve(publicDir, `.${_placeholder}`)).href}` };
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, transform(v)]));
  }
  return value;
}

export function toNdjson(): string {
  return seedDocuments.map((doc) => JSON.stringify(transform(doc))).join("\n") + "\n";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, toNdjson());
  console.log(`Wrote ${seedDocuments.length} documents to ${outFile}`);
}
