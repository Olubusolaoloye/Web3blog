/**
 * Server-side cache for third-party market data (CLAUDE.md §7.3, rule 4).
 *
 * - Fresh window: serve from cache without calling upstream (prices 60 s, metadata 1 h).
 * - Stale window: keep the last good value much longer and serve it when upstream fails or when the
 *   upstream rate limiter says no, so normal browsing can never exceed the CoinGecko quota.
 * - Single-flight: concurrent misses for the same key share one upstream request.
 * Storage is Upstash Redis (REST) when configured, otherwise in-memory (dev, tests, single instance).
 */

export interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

export interface CacheStore {
  readonly name: string;
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void>;
}

export class MemoryStore implements CacheStore {
  readonly name = "memory";
  private map = new Map<string, { entry: CacheEntry<unknown>; expiresAt: number }>();
  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= this.now()) {
      this.map.delete(key);
      return null;
    }
    return hit.entry as CacheEntry<T>;
  }

  async set<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void> {
    this.map.set(key, { entry, expiresAt: this.now() + ttlSeconds * 1000 });
  }
}

/** Upstash Redis over its REST API (no SDK needed). */
export class UpstashStore implements CacheStore {
  readonly name = "upstash";
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call(path: string, init?: RequestInit): Promise<unknown> {
    const res = await this.fetchImpl(`${this.url.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await this.call(`/get/${encodeURIComponent(key)}`);
    return typeof raw === "string" ? (JSON.parse(raw) as CacheEntry<T>) : null;
  }

  async set<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void> {
    await this.call(`/set/${encodeURIComponent(key)}?EX=${Math.max(1, Math.ceil(ttlSeconds))}`, {
      method: "POST",
      body: JSON.stringify(entry),
    });
  }
}

/** Sliding-window limiter for upstream calls (per process). */
export class UpstreamLimiter {
  private calls: number[] = [];
  constructor(
    readonly maxPerWindow: number,
    readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * @param reserve calls to leave free for higher-priority keys. Optional data (charts, coin metadata) passes a
   * reserve so it can never starve the price list that every page needs.
   */
  tryTake(reserve = 0): boolean {
    const t = this.now();
    this.calls = this.calls.filter((c) => t - c < this.windowMs);
    if (this.calls.length >= this.maxPerWindow - reserve) return false;
    this.calls.push(t);
    return true;
  }

  get used(): number {
    const t = this.now();
    return this.calls.filter((c) => t - c < this.windowMs).length;
  }
}

export class UpstreamUnavailableError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`No cached value for ${key} and upstream is unavailable`, { cause });
  }
}

export interface CachePolicy {
  /** Seconds a value is served without refreshing. */
  fresh: number;
  /** Seconds a value is kept to serve when upstream fails or is rate-limited. */
  stale: number;
  /** Upstream calls per window kept free for higher-priority keys (see UpstreamLimiter.tryTake). */
  reserve?: number;
}

export const TTL = {
  prices: { fresh: 60, stale: 60 * 60 * 24 },
  metadata: { fresh: 60 * 60, stale: 60 * 60 * 24 * 7 },
  fx: { fresh: 60 * 60, stale: 60 * 60 * 24 * 7 },
  chartShort: { fresh: 5 * 60, stale: 60 * 60 * 24, reserve: 5 },
  chartLong: { fresh: 60 * 60, stale: 60 * 60 * 24 * 7, reserve: 5 },
  coinDetail: { fresh: 60 * 60, stale: 60 * 60 * 24 * 7, reserve: 5 },
} as const satisfies Record<string, CachePolicy>;

export type CacheSource = "fresh" | "upstream" | "stale";

export class SwrCache {
  private inflight = new Map<string, Promise<unknown>>();
  readonly stats = { fresh: 0, upstream: 0, stale: 0 };

  constructor(
    readonly store: CacheStore,
    private readonly limiter?: UpstreamLimiter,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, policy: CachePolicy, load: () => Promise<T>): Promise<{ value: T; source: CacheSource }> {
    const entry = await this.store.get<T>(key).catch(() => null);
    if (entry && this.now() - entry.storedAt < policy.fresh * 1000) {
      this.stats.fresh++;
      return { value: entry.value, source: "fresh" };
    }

    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) {
      const value = await pending;
      this.stats.fresh++;
      return { value, source: "fresh" };
    }

    if (this.limiter && !this.limiter.tryTake(policy.reserve ?? 0)) {
      if (entry) {
        this.stats.stale++;
        return { value: entry.value, source: "stale" };
      }
      throw new UpstreamUnavailableError(key, "rate limited");
    }

    const run = (async () => {
      const value = await load();
      await this.store.set(key, { value, storedAt: this.now() }, policy.stale).catch(() => undefined);
      return value;
    })();
    this.inflight.set(key, run);
    try {
      const value = await run;
      this.stats.upstream++;
      return { value, source: "upstream" };
    } catch (error) {
      if (entry) {
        this.stats.stale++;
        return { value: entry.value, source: "stale" };
      }
      throw new UpstreamUnavailableError(key, error);
    } finally {
      this.inflight.delete(key);
    }
  }
}
