import type { ReactNode } from "react";
import { useRouteLoaderData } from "react-router";
import type { CountryCode } from "~/config/countries";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { Breadcrumbs } from "./Breadcrumbs";

interface Props {
  title: string;
  path: string;
  intro?: ReactNode;
  updated?: string;
  children: ReactNode;
}

/** Shell for trust and legal pages: breadcrumbs, readable column, capture box (CLAUDE.md §8). */
export function StaticPage({ title, path, intro, updated, children }: Props) {
  const site = useRouteLoaderData("routes/_site") as { countryCode: CountryCode } | undefined;
  return (
    <div className="container-content py-6 sm:py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: title, path }]} />
      <div className="mx-auto max-w-[var(--container-article)] space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {intro ? <div className="text-lg text-muted">{intro}</div> : null}
          {updated ? <p className="text-sm text-muted">Last updated {updated}</p> : null}
        </header>
        <div className="prose-article">{children}</div>
        <NewsletterBox variant="page" country={site?.countryCode ?? "ng"} />
      </div>
    </div>
  );
}
