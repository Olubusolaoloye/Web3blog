import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Footer } from "~/components/layout/Footer";

let cached: { year: number; html: string } | undefined;

/**
 * The footer is static, so it ships as server-rendered HTML instead of a hydrated component. That keeps the
 * footer's code and link data out of every page's JS (article budget, decision 42). Cached per process and year.
 */
export function footerHtml(): string {
  const year = new Date().getFullYear();
  if (cached?.year !== year) {
    // MemoryRouter only supplies context for <Link>; the output is plain anchors.
    cached = {
      year,
      html: renderToStaticMarkup(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>,
      ),
    };
  }
  return cached.html;
}
