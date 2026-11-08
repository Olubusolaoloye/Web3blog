import { data } from "react-router";
import type { Route } from "./+types/_site.$";
import { NotFound } from "~/components/layout/NotFound";
import { buildMeta } from "~/lib/seo/meta";

export function loader() {
  return data(null, { status: 404 });
}

export function meta({ location }: Route.MetaArgs) {
  return buildMeta({ title: "Page not found", path: location.pathname, noindex: true });
}

export default function CatchAll() {
  return <NotFound />;
}
