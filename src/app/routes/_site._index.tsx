import type { Route } from "./+types/_site._index";
import { ArticleCard } from "~/components/article/ArticleCard";
import { site } from "~/config/site";
import { getContentSource } from "~/lib/content/source.server";
import { buildMeta } from "~/lib/seo/meta";

export function meta(_: Route.MetaArgs) {
  return buildMeta({ title: `${site.name}: ${site.tagline}`, rawTitle: true, path: "/" });
}

export async function loader() {
  const articles = await getContentSource().listArticles({ limit: 10 });
  return { articles };
}

// Phase 1 homepage: latest stories only. The full module layout (CLAUDE.md §7.1) lands in Phase 2.
export default function Home({ loaderData }: Route.ComponentProps) {
  const [lead, ...rest] = loaderData.articles;
  return (
    <div className="container-content space-y-8 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold sm:text-4xl">{site.tagline}</h1>
        <p className="text-muted">{site.description}</p>
      </header>
      {lead ? (
        <section aria-labelledby="top-stories" className="space-y-4">
          <h2 id="top-stories" className="text-xl font-semibold">
            Top stories
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ArticleCard article={lead} priority />
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-muted">No stories yet.</p>
      )}
    </div>
  );
}
