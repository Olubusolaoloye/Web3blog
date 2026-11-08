import { Link } from "react-router";
import type { ArticleSummary } from "~/lib/content/types";
import { SanityImage } from "~/components/media/SanityImage";
import { formatDate } from "~/lib/dates";

interface Props {
  article: ArticleSummary;
  priority?: boolean;
  /** Keeps the heading outline sequential: h2 when the grid sits directly under the page h1. */
  headingLevel?: 2 | 3;
}

export function ArticleCard({ article, priority = false, headingLevel = 3 }: Props) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group flex flex-col overflow-hidden rounded-brand border border-border bg-surface">
      <Link to={`/news/${article.slug}`} className="block" tabIndex={-1} aria-hidden>
        <SanityImage image={article.heroImage} priority={priority} sizes="(min-width: 1024px) 380px, 100vw" className="aspect-[16/9]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {article.category ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-signal-ink">{article.category.title}</p>
        ) : null}
        <Heading className="text-lg font-semibold leading-snug">
          <Link to={`/news/${article.slug}`} className="hover:text-signal-ink">
            {article.title}
          </Link>
        </Heading>
        <p className="line-clamp-2 text-sm text-muted">{article.bottomLine[0]}</p>
        <p className="mt-auto pt-2 text-xs text-muted">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </p>
      </div>
    </article>
  );
}
