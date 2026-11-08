import { useEffect, useSyncExternalStore } from "react";
import type { LocalQuote } from "./types";

/**
 * Live price refresh for chips and the ticker: ONE shared poller per page that asks /api/prices for every
 * subscribed coin every 60 s, pauses while the tab is hidden, and refreshes on return. No TanStack Query here
 * (article JS budget, docs/decisions.md #28). Server-rendered values are used until the first refresh.
 */
export const REFRESH_MS = 60_000;

const quotes = new Map<string, LocalQuote>();
const subscribers = new Map<string, number>(); // "CUR:id" → refcount
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let lastPoll = 0;

const keyOf = (currency: string, id: string) => `${currency}:${id}`;

export async function pollNow(fetchImpl: typeof fetch = fetch): Promise<void> {
  lastPoll = Date.now();
  const byCurrency = new Map<string, string[]>();
  for (const key of subscribers.keys()) {
    const [currency, id] = key.split(":") as [string, string];
    byCurrency.set(currency, [...(byCurrency.get(currency) ?? []), id]);
  }
  await Promise.all(
    [...byCurrency].map(async ([currency, ids]) => {
      try {
        const res = await fetchImpl(`/api/prices?currency=${currency}&ids=${ids.join(",")}`);
        if (!res.ok) return;
        const body = (await res.json()) as { quotes: LocalQuote[] };
        for (const q of body.quotes) quotes.set(keyOf(currency, q.id), q);
      } catch {
        // Keep showing the last known price.
      }
    }),
  );
  for (const l of listeners) l();
}

function onVisibility() {
  if (document.visibilityState === "visible" && Date.now() - lastPoll >= REFRESH_MS) void pollNow();
}

function start() {
  if (timer || typeof window === "undefined") return;
  lastPoll = Date.now();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") void pollNow();
  }, REFRESH_MS);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
  document.removeEventListener("visibilitychange", onVisibility);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns the freshest quote for `initial` (same coin + currency), refreshed in the background. */
export function useLiveQuote(initial: LocalQuote, enabled = true): LocalQuote {
  const key = keyOf(initial.currency, initial.id);
  useEffect(() => {
    if (!enabled) return;
    subscribers.set(key, (subscribers.get(key) ?? 0) + 1);
    start();
    return () => {
      const n = (subscribers.get(key) ?? 1) - 1;
      if (n <= 0) subscribers.delete(key);
      else subscribers.set(key, n);
      if (subscribers.size === 0) stop();
    };
  }, [key, enabled]);
  return useSyncExternalStore(
    subscribe,
    () => (enabled ? quotes.get(key) : undefined) ?? initial,
    () => initial,
  );
}

/** Test helper. */
export function __resetLive() {
  quotes.clear();
  subscribers.clear();
  listeners.clear();
  if (typeof window !== "undefined") stop();
}
