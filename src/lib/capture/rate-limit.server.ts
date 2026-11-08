/** Fixed-window rate limiting per key (CLAUDE.md §8). Upstash REST when configured, in-memory otherwise. */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  readonly name: string;
  limit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  readonly name = "memory";
  private windows = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly now: () => number = Date.now) {}

  async limit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
    const t = this.now();
    let w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      w = { count: 0, resetAt: t + windowSeconds * 1000 };
      this.windows.set(key, w);
    }
    w.count++;
    return { ok: w.count <= max, remaining: Math.max(0, max - w.count), retryAfterSeconds: Math.ceil((w.resetAt - t) / 1000) };
  }

  reset(): void {
    this.windows.clear();
  }
}

export class UpstashRateLimiter implements RateLimiter {
  readonly name = "upstash";
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async limit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
    const k = `rl:${key}`;
    const res = await this.fetchImpl(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", k], ["EXPIRE", k, String(windowSeconds), "NX"], ["TTL", k]]),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const [incr, , ttl] = (await res.json()) as Array<{ result: number }>;
    const count = Number(incr?.result ?? 0);
    return { ok: count <= max, remaining: Math.max(0, max - count), retryAfterSeconds: Math.max(1, Number(ttl?.result ?? windowSeconds)) };
  }
}

/** Limits used by capture endpoints. */
export const LIMITS = {
  subscribe: { max: 5, windowSeconds: 10 * 60 },
  lead: { max: 3, windowSeconds: 60 * 60 },
} as const;
