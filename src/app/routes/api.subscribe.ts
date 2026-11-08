import { data, redirect } from "react-router";
import type { Route } from "./+types/api.subscribe";
import { getCaptureDeps } from "~/lib/capture/deps.server";
import { LIMITS } from "~/lib/capture/rate-limit.server";
import { clientIp, readUtm } from "~/lib/capture/request.server";
import { subscribeSchema } from "~/lib/capture/schema";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC = "Something went wrong. Please try again.";

/**
 * Newsletter sign-up (CLAUDE.md §8): validate → rate limit → store (first capture keeps its source) → beehiiv.
 * The response never reveals whether an email was already subscribed.
 */
export async function action({ request }: Route.ActionArgs) {
  const deps = getCaptureDeps();
  const rl = await deps.limiter.limit(`subscribe:${clientIp(request)}`, LIMITS.subscribe.max, LIMITS.subscribe.windowSeconds);
  if (!rl.ok) {
    return data<Result>({ ok: false, error: "Too many attempts. Please try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  const parsed = subscribeSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    // Honeypot hits get a generic error; don't tell bots what tripped them.
    if (fieldErrors.website) return data<Result>({ ok: false, error: GENERIC }, { status: 400 });
    return data<Result>({ ok: false, error: Object.values(fieldErrors)[0] ?? "Check the form and try again.", fieldErrors }, { status: 400 });
  }

  const input = parsed.data;
  const utm = (await readUtm(request)) as Record<string, string>;
  try {
    const { id, created } = await deps.store.addSubscriber({
      email: input.email,
      country_code: input.country,
      experience_level: input.experience,
      interests: input.interests,
      source: input.source,
      utm,
    });
    if (created) {
      try {
        const sub = await deps.newsletter.subscribe({ email: input.email, country: input.country, source: input.source, utm, interests: input.interests });
        if (sub) await deps.store.markSubscriberActive(id, sub.id);
      } catch (error) {
        // The row stays `pending` and can be re-synced; the reader still gets a success.
        console.error("[subscribe] newsletter provider failed", error);
      }
    }
    return data<Result>({ ok: true });
  } catch (error) {
    console.error("[subscribe] store failed", error);
    return data<Result>({ ok: false, error: GENERIC }, { status: 500 });
  }
}

export function loader() {
  return redirect("/");
}
