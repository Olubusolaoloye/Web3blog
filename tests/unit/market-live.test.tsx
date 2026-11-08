// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetLive, pollNow, REFRESH_MS, useLiveQuote } from "~/lib/market/live";
import type { LocalQuote } from "~/lib/market/types";

const q = (id: string, currency: string, price: number): LocalQuote => ({ id, symbol: id.toUpperCase(), name: id, currency, price, change24h: 0 });

function Probe({ quote }: { quote: LocalQuote }) {
  const live = useLiveQuote(quote);
  return <span data-testid={`${quote.currency}-${quote.id}`}>{live.price}</span>;
}

afterEach(() => {
  cleanup();
  __resetLive();
  vi.useRealTimers();
});

describe("live price refresh", () => {
  it("shows the server value, then refreshes every coin in one request per currency", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = new URL(url, "http://x");
      const currency = u.searchParams.get("currency") as string;
      const ids = (u.searchParams.get("ids") as string).split(",");
      return Response.json({ quotes: ids.map((id) => q(id, currency, currency === "NGN" ? 200 : 20)) });
    });
    render(
      <>
        <Probe quote={q("btc", "NGN", 100)} />
        <Probe quote={q("eth", "NGN", 100)} />
        <Probe quote={q("btc", "KES", 10)} />
      </>,
    );
    expect(screen.getByTestId("NGN-btc")).toHaveTextContent("100");
    await act(() => pollNow(fetchMock as unknown as typeof fetch));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(["/api/prices?currency=NGN&ids=btc,eth", "/api/prices?currency=KES&ids=btc"]),
    );
    expect(screen.getByTestId("NGN-btc")).toHaveTextContent("200");
    expect(screen.getByTestId("KES-btc")).toHaveTextContent("20");
  });

  it("keeps the last price when the request fails", async () => {
    render(<Probe quote={q("btc", "NGN", 100)} />);
    await act(() => pollNow((async () => new Response(null, { status: 503 })) as unknown as typeof fetch));
    expect(screen.getByTestId("NGN-btc")).toHaveTextContent("100");
  });

  it("polls on an interval and only while the tab is visible", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ quotes: [] }));
    render(<Probe quote={q("btc", "NGN", 100)} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_MS);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_MS * 3);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    fetchSpy.mockRestore();
  });
});
