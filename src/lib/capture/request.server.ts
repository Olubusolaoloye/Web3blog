import { createCookie } from "react-router";

/** First-touch attribution (CLAUDE.md §8): set once, kept 30 days, attached to every subscriber and lead. */
export const utmCookie = createCookie("hl_utm", { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 30 });

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number] | "landing" | "referrer", string>>;

/** UTM params from a landing URL (plus landing path and external referrer). Null when there are none. */
export function utmFromRequest(request: Request): Utm | null {
  const url = new URL(request.url);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const v = url.searchParams.get(key)?.trim();
    if (v) utm[key] = v.slice(0, 100);
  }
  if (Object.keys(utm).length === 0) return null;
  utm.landing = url.pathname.slice(0, 200);
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const host = new URL(ref).host;
      if (host !== url.host) utm.referrer = host.slice(0, 100);
    } catch {
      // ignore malformed referrers
    }
  }
  return utm;
}

export async function readUtm(request: Request): Promise<Utm> {
  const value = (await utmCookie.parse(request.headers.get("Cookie"))) as unknown;
  return value && typeof value === "object" ? (value as Utm) : {};
}

/**
 * Client IP for rate limiting. Only ONE header is trusted: the one your edge sets and clients can't forge
 * (Netlify: `x-nf-client-connection-ip`, the default). Override with TRUSTED_IP_HEADER (e.g. `cf-connecting-ip`
 * behind Cloudflare). Anything else (x-forwarded-for, x-real-ip) can be spoofed to dodge limits, so it's ignored.
 */
export function clientIp(request: Request, trustedHeader = process.env.TRUSTED_IP_HEADER || "x-nf-client-connection-ip"): string {
  return request.headers.get(trustedHeader)?.split(",")[0]?.trim() || "unknown";
}
