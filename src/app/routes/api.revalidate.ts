import type { Route } from "./+types/api.revalidate";
import { getCachePurger } from "~/lib/cache/purge.server";
import { handleRevalidate } from "~/lib/cache/revalidate.server";

/**
 * Sanity GROQ webhook target. Configure in sanity.io/manage → API → Webhooks:
 * URL <site>/api/revalidate, trigger on create/update/delete, filter `_type in ["article","sponsoredPost","author"]`,
 * projection `{_type, "slug": slug.current}`, secret = SANITY_REVALIDATE_SECRET.
 */
export function action({ request }: Route.ActionArgs) {
  return handleRevalidate(request, { secret: process.env.SANITY_REVALIDATE_SECRET, purger: getCachePurger() });
}

export function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
