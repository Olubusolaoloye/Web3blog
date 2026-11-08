/**
 * Pure editorial rules shared by Studio validation and the app's tests (CLAUDE.md §5, §13 rule 3).
 * No Sanity imports here so the root test suite can import this file directly.
 */
export const MIN_HERO_WIDTH = 1200;
export const MAX_BOTTOM_LINE = 3;

/** Sanity image asset ids encode dimensions: image-<hash>-<width>x<height>-<ext> */
export function dimensionsFromAssetRef(ref: string | undefined): { width: number; height: number } | undefined {
  const m = ref?.match(/^image-[a-zA-Z0-9]+-(\d+)x(\d+)-[a-z0-9]+$/);
  if (!m) return undefined;
  return { width: Number(m[1]), height: Number(m[2]) };
}

export function heroImageError(image: { asset?: { _ref?: string }; alt?: string } | undefined): string | true {
  if (!image?.asset?._ref) return "A hero image is required.";
  const dims = dimensionsFromAssetRef(image.asset._ref);
  if (dims && dims.width < MIN_HERO_WIDTH) return `Hero image must be at least ${MIN_HERO_WIDTH}px wide (this one is ${dims.width}px).`;
  if (!image.alt?.trim()) return "Alt text is required for the hero image.";
  return true;
}

export function bottomLineError(points: readonly string[] | undefined): string | true {
  const filled = (points ?? []).filter((p) => p?.trim());
  if (filled.length === 0) return "The Bottom Line needs at least one bullet.";
  if (filled.length > MAX_BOTTOM_LINE) return `The Bottom Line can have at most ${MAX_BOTTOM_LINE} bullets.`;
  return true;
}

export function sourcesError(type: string | undefined, sources: readonly unknown[] | undefined): string | true {
  if (type === "news" && (!sources || sources.length < 1)) return "News articles need at least one source.";
  return true;
}

/** True when a document would pass the publish rules for news (used by tests over seed data). */
export function isPublishableNews(doc: { type?: string; bottomLine?: string[]; sources?: unknown[] }): boolean {
  return bottomLineError(doc.bottomLine) === true && sourcesError(doc.type, doc.sources) === true;
}
