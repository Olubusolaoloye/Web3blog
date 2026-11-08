import { data, redirect } from "react-router";
import type { Route } from "./+types/api.subscribe";
import { subscribeSchema } from "~/lib/capture/schema";

/**
 * Phase 2: validates input (Zod + honeypot) so the forms are real and testable.
 * Phase 4 adds rate limiting, the `subscribers` insert, beehiiv and analytics. Until then we say so honestly.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = subscribeSchema.safeParse(form);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    // Honeypot hits get a generic error; don't tell bots what tripped them.
    if (fieldErrors.website) return data({ ok: false as const, error: "Something went wrong. Please try again." }, { status: 400 });
    return data({ ok: false as const, error: Object.values(fieldErrors)[0] ?? "Check the form and try again.", fieldErrors }, { status: 400 });
  }
  return data(
    { ok: false as const, error: "Newsletter sign-ups open soon. Thanks for your interest!" },
    { status: 503 },
  );
}

export function loader() {
  return redirect("/");
}
