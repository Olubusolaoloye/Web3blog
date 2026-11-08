import { Link } from "react-router";

export interface Crumb {
  name: string;
  path: string;
}

/** Visible breadcrumbs. Pair with `breadcrumbJsonLd(items)` in the route's meta. Last item is the current page. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-text">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link to={c.path} className="hover:text-text">
                    {c.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
