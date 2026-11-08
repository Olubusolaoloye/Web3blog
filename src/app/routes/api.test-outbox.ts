import type { Route } from "./+types/api.test-outbox";
import { getCaptureDeps } from "~/lib/capture/deps.server";
import { MemoryRateLimiter } from "~/lib/capture/rate-limit.server";
import { MemoryCaptureStore } from "~/lib/capture/stores.server";
import { OutboxNotifier } from "~/lib/messaging/notify.server";

/**
 * E2E inspection of in-memory capture data. Only exists when E2E_TEST_MODE=1 AND no real backend is configured,
 * so it can never expose production data.
 */
function enabled(): boolean {
  const deps = getCaptureDeps();
  return process.env.E2E_TEST_MODE === "1" && deps.store instanceof MemoryCaptureStore && deps.notifier instanceof OutboxNotifier;
}

export function loader() {
  if (!enabled()) return new Response("Not found", { status: 404 });
  const store = getCaptureDeps().store as MemoryCaptureStore;
  const notifier = getCaptureDeps().notifier as OutboxNotifier;
  return Response.json({ subscribers: store.subscribers, leads: store.leads, orders: store.orders, team: notifier.team, emails: notifier.emails });
}

export function action(_: Route.ActionArgs) {
  if (!enabled()) return new Response("Not found", { status: 404 });
  const deps = getCaptureDeps();
  (deps.store as MemoryCaptureStore).reset();
  (deps.notifier as OutboxNotifier).reset();
  if (deps.limiter instanceof MemoryRateLimiter) deps.limiter.reset();
  return Response.json({ reset: true });
}
