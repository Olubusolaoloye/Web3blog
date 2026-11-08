import type { Source } from "~/lib/content/types";

interface Props {
  sources: readonly Source[];
  /** Sponsored content must use rel="sponsored nofollow" (CLAUDE.md §13 rule 2). */
  sponsored?: boolean;
}

/** "Sources" list at the end of every article. */
export function SourceList({ sources, sponsored = false }: Props) {
  if (sources.length === 0) return null;
  const rel = sponsored ? "sponsored nofollow noopener" : "noopener";
  return (
    <section aria-labelledby="sources-heading" className="border-t border-border pt-6" data-testid="source-list">
      <h2 id="sources-heading" className="mb-3 text-lg font-semibold">
        Sources
      </h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
        {sources.map((s) => (
          <li key={s.url + s.label}>
            <a href={s.url} rel={rel} target="_blank" className="text-text underline hover:text-signal-ink">
              {s.label}
            </a>
            <span className="ml-2 inline-block break-words">{new URL(s.url).hostname.replace(/^www\./, "")}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
