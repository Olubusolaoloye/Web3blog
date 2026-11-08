/**
 * Non-critical browser enhancements, loaded as one lazy chunk after hydration so they add nothing to page bundles:
 * pageview analytics and (desktop only) the exit-intent modal.
 */
import { track } from "~/lib/analytics/client";

let armed = false;

export function onNavigate(path: string, countryCode: string): void {
  track("$pageview", { path });
  if (armed) return;
  armed = true;
  setTimeout(() => {
    if (window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) {
      void import("~/components/capture/exit-intent").then((m) => m.arm(countryCode));
    }
  }, 3000);
}
