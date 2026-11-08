/**
 * Analytics client: GA4 (gtag, loaded after idle) + PostHog (events sent to its HTTP capture API, so we don't ship
 * the PostHog SDK). Both are optional: without VITE_GA_ID / VITE_POSTHOG_KEY nothing is loaded or sent.
 * Feature flags come from PostHog's /decide endpoint and fall back to config/flags.ts.
 */
import { flags as staticFlags, type FlagName } from "~/config/flags";

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const PH_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const PH_HOST = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com").replace(/\/$/, "");

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** Anonymous id for PostHog (no personal data). */
function distinctId(): string {
  try {
    const key = "hl_aid";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

let gaLoaded = false;
function ensureGa(): void {
  if (!GA_ID || gaLoaded) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag requires the `arguments` object
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
  const load = () => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
  };
  // Third-party script after the page is idle, so it never competes with LCP.
  if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  ensureGa();
  if (GA_ID && window.gtag) {
    if (event === "$pageview") window.gtag("event", "page_view", { page_path: props.path, page_location: location.href });
    else window.gtag("event", event, props);
  }
  if (PH_KEY) {
    const body = JSON.stringify({
      api_key: PH_KEY,
      event,
      distinct_id: distinctId(),
      properties: { ...props, $current_url: location.href, $pathname: location.pathname, $referrer: document.referrer },
      timestamp: new Date().toISOString(),
    });
    // sendBeacon survives page unloads; fall back to keepalive fetch.
    if (!navigator.sendBeacon?.(`${PH_HOST}/capture/`, new Blob([body], { type: "application/json" }))) {
      void fetch(`${PH_HOST}/capture/`, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
    }
  }
  if (import.meta.env.DEV) console.debug("[analytics]", event, props);
}

let flagsPromise: Promise<Record<string, boolean>> | undefined;

/** PostHog feature flag with the static default as fallback. */
export async function getFlag(name: FlagName): Promise<boolean> {
  if (!PH_KEY) return staticFlags[name];
  flagsPromise ??= fetch(`${PH_HOST}/decide/?v=3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: PH_KEY, distinct_id: distinctId() }),
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ featureFlags?: Record<string, boolean | string> }>) : {}))
    .then((j) => Object.fromEntries(Object.entries((j as { featureFlags?: Record<string, unknown> }).featureFlags ?? {}).map(([k, v]) => [k, v === true || v === "true"])))
    .catch(() => ({}));
  const remote = await flagsPromise;
  return remote[name] ?? staticFlags[name];
}
