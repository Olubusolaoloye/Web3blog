import type { BodyBlock } from "./types";

const WORDS_PER_MINUTE = 220;

/** Plain text from Portable Text blocks (custom blocks are ignored). */
export function toPlainText(blocks: readonly BodyBlock[]): string {
  return blocks
    .map((b) => {
      if (b._type !== "block" || !Array.isArray((b as { children?: unknown }).children)) return "";
      return ((b as { children: { text?: string }[] }).children ?? []).map((c) => c.text ?? "").join("");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function readingTimeMinutes(blocks: readonly BodyBlock[]): number {
  const words = toPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
