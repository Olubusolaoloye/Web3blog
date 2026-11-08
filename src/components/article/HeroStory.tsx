import { Link } from "react-router";
import type { ArticleSummary } from "~/lib/content/types";
import { formatDate } from "~/lib/dates";
import { SanityImage } from "~/components/media/SanityImage";

/** Lead story on the homepage. Its image is the LCP element, so it loads with high priority. */
export function HeroStory({ article }: { article: ArticleSummary }) {
  return (
    <article className="grid overflow-hidden rounded-brand border border-border bg-surface md:grid-cols-[3fr_2fr]" data-testid="hero-story">
      <Link to={`/news/${article.slug}`} tabIndex={-1} aria-hidden>
        <SanityImage image={article.heroImage} priority sizes="(min-width: 768px) 700px, 100vw" className="aspect-[16/9] h-full" />
      </Link>
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        {article.isBreaking ? (
          <p className="w-fit rounded-full bg-alert px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-bg">Breaking</p>
        ) : null}
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
          <Link to={`/news/${article.slug}`} className="hover:text-signal-ink">
            {article.title}
          </Link>
        </h2>
        <ul className="space-y-1.5 text-sm text-muted">
          {article.bottomLine.slice(0, 2).map((b) => (
            <li key={b} className="flex gap-2">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-signal" />
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-auto text-xs text-muted">
          {article.authorNames.join(", ")} · <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
