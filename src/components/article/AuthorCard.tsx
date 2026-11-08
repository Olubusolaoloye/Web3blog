import { Link } from "react-router";
import type { AuthorSummary } from "~/lib/content/types";
import { SanityImage } from "~/components/media/SanityImage";

interface Props {
  author: AuthorSummary;
}

/** Photo, name, role, expertise and a holdings-disclosure link (CLAUDE.md §4). */
export function AuthorCard({ author }: Props) {
  const profile = `/authors/${author.slug}`;
  return (
    <section
      className="flex gap-4 rounded-brand border border-border bg-surface p-4"
      aria-label={`About the author, ${author.name}`}
      data-testid="author-card"
    >
      {author.photo ? (
        <div className="size-16 shrink-0 overflow-hidden rounded-full">
          <SanityImage image={author.photo} sizes="64px" className="size-16" />
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        <p className="font-display text-lg font-semibold leading-tight">
          <Link to={profile} className="hover:text-signal-ink">
            {author.name}
          </Link>
        </p>
        <p className="text-sm text-muted">{author.role}</p>
        {author.expertise.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Expertise">
            {author.expertise.map((e) => (
              <li key={e} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                {e}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="pt-1 text-xs">
          <Link to={`${profile}#holdings`} className="text-signal-ink underline">
            Holdings disclosure
          </Link>
        </p>
      </div>
    </section>
  );
}
