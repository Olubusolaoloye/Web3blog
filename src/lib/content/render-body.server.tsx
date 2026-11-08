import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { PortableBody } from "~/components/article/PortableBody";
import type { LocalQuote } from "~/lib/market/types";
import type { BodyBlock } from "./types";

/**
 * Renders Portable Text to HTML on the server. The article route ships this HTML instead of the Portable Text
 * renderer, which keeps the article JS within the 120 KB budget (CLAUDE.md §9). Output is produced by React
 * (escaped text, no raw HTML from the CMS), so it is safe to inject.
 */
export function renderBodyHtml(
  blocks: readonly BodyBlock[],
  opts: { quotes: Record<string, LocalQuote>; locale: string; sponsored?: boolean },
): string {
  if (blocks.length === 0) return "";
  return renderToStaticMarkup(
    <MemoryRouter>
      <PortableBody value={[...blocks]} quotes={opts.quotes} locale={opts.locale} sponsored={opts.sponsored} />
    </MemoryRouter>,
  );
}
