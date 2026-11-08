import type { Route } from "./+types/api.prices";
import { isSupportedCurrency, MarketService } from "~/lib/market/service.server";

const ID = /^[a-z0-9-]{1,64}$/;

/**
 * GET /api/prices?ids=bitcoin,ethereum&currency=NGN
 * The only way the browser gets prices (CLAUDE.md rule 4): served from the server-side cache, never CoinGecko directly.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const currency = (url.searchParams.get("currency") ?? "USD").toUpperCase();
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!isSupportedCurrency(currency)) return Response.json({ error: "Unsupported currency" }, { status: 400 });
  if (ids.length === 0 || ids.length > 50 || !ids.every((id) => ID.test(id))) {
    return Response.json({ error: "Pass 1–50 coin ids" }, { status: 400 });
  }
  try {
    const service = new MarketService();
    const quotes = await service.quotes(currency, ids);
    return Response.json(
      { currency, sample: service.sample, quotes },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("[api/prices]", error);
    return Response.json({ error: "Prices are temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
