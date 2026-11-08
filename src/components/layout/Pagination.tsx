import { Link } from "react-router";

interface Props {
  page: number;
  totalPages: number;
  /** Builds the href for a page number. */
  hrefFor: (page: number) => string;
}

export function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  const btn = "inline-flex h-10 items-center rounded-brand border border-border px-4 text-sm hover:bg-surface-2";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link className={btn} to={hrefFor(page - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link className={btn} to={hrefFor(page + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
