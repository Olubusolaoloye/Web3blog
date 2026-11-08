/**
 * Feature flags. Static defaults here; PostHog flags override them on the client from Phase 4.
 */
export const flags = {
  /** WhatsApp Cloud API alert channel. Off until Meta approves the business account. */
  whatsappAlerts: false,
  /** Exit-intent / scroll-depth newsletter modal (desktop only, once per 7 days). */
  exitIntent: false,
} as const;

export type FlagName = keyof typeof flags;

export function isEnabled(flag: FlagName, overrides?: Partial<Record<FlagName, boolean>>): boolean {
  return overrides?.[flag] ?? flags[flag];
}
