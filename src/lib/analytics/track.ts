/**
 * Tiny analytics entry point for components. The real client (GA4 + PostHog) is a separate chunk loaded on first
 * use, so analytics adds almost nothing to page bundles (article JS budget, CLAUDE.md §9).
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  void import("./client").then((m) => m.track(event, props));
}
