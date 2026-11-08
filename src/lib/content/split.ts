import type { BodyBlock } from "./types";

const isListItem = (b: BodyBlock | undefined) => Boolean(b && (b as { listItem?: unknown }).listItem);

/**
 * Splits a body at roughly `ratio` of its blocks for the inline capture box (CLAUDE.md §8: "after ~40%").
 * Never splits inside a list; returns [body, []] when the body is too short to split sensibly.
 */
export function splitBody(blocks: readonly BodyBlock[], ratio = 0.4): [BodyBlock[], BodyBlock[]] {
  if (blocks.length < 4) return [[...blocks], []];
  let i = Math.max(1, Math.ceil(blocks.length * ratio));
  while (i < blocks.length && isListItem(blocks[i]) && isListItem(blocks[i - 1])) i++;
  if (i >= blocks.length) return [[...blocks], []];
  return [blocks.slice(0, i), blocks.slice(i)];
}
