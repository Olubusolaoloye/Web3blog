import type { ArticleSummary } from "~/lib/content/types";
import { ArticleCard } from "./ArticleCard";

export function RelatedStories({ articles }: { articles: readonly ArticleSummary[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="space-y-4" data-testid="related-stories">
      <h2 id="related-heading" className="text-xl font-semibold">
        Related stories
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
