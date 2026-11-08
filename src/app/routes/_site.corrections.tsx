import { Link } from "react-router";
import type { Route } from "./+types/_site.corrections";
import { StaticPage } from "~/components/layout/StaticPage";
import { getContentSource } from "~/lib/content/source.server";
import { formatDate } from "~/lib/dates";
import { staticMeta } from "~/lib/seo/static-meta";

export async function loader() {
  return { corrections: await getContentSource().listCorrections() };
}

export const meta = () => staticMeta("Corrections", "/corrections", "Every correction we have made to our reporting, newest first.");

export default function Corrections({ loaderData }: Route.ComponentProps) {
  const { corrections } = loaderData;
  return (
    <StaticPage
      title="Corrections"
      path="/corrections"
      intro={
        <>
          We correct mistakes openly. See our <Link to="/standards#corrections">corrections policy</Link> or{" "}
          <Link to="/contact">report an error</Link>.
        </>
      }
    >
      {corrections.length ? (
        <ol className="!list-none !pl-0 space-y-4" data-testid="corrections-list">
          {corrections.map((c) => (
            <li key={c.id} className="rounded-brand border border-border bg-surface p-4">
              <p className="text-sm text-muted">
                <time dateTime={c.date}>{formatDate(c.date)}</time>
              </p>
              <p className="font-semibold">
                <Link to={`/news/${c.article.slug}`}>{c.article.title}</Link>
              </p>
              <p className="mt-1">{c.note}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p>No corrections yet.</p>
      )}
    </StaticPage>
  );
}
