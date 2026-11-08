# Phase 3 — Markets and Local

Status: **done**

## Goal
Real market data (CoinGecko + FX) behind a server-side cache, live PriceChip and Ticker, `/markets`, coin pages,
converter pages that only exist when they have local content, and local hubs for ng/ke/za/gh driven by config + CMS.

## Design
- **One upstream call feeds almost everything.** `GET /coins/markets?vs_currency=usd&per_page=250&sparkline=true`
  returns the top 250 with 24h/7d change and a 7-day sparkline. Ticker, chips, the table and converters all read
  this one cached list (60 s). Prices are converted from USD with FX rates (cached 1 h), so every currency is
  consistent and conversion is testable in one place.
- **Cache** (`lib/market/cache.ts`): Upstash Redis REST when configured, in-memory otherwise. Fresh/stale windows
  (serve stale on upstream error), in-process single-flight (concurrent misses share one request), and an upstream
  rate limiter that serves stale instead of exceeding CoinGecko's per-minute limit.
- **Providers behind interfaces:** `MarketProvider` (CoinGecko | fixtures), `FxProvider` (open.er-api | fixtures),
  `P2pProvider` (Supabase `p2p_rates` | fixtures; scraper/API adapters later), `DirectoryProvider` (Supabase | fixtures).
  No CoinGecko key → fixtures, labelled "Sample data" in the UI (same pattern as Sanity).
- **Browser never calls CoinGecko.** Client refresh polls `/api/prices` (one shared poller, 60 s, paused when the tab
  is hidden). No TanStack Query on the article route (bundle budget, decision 28).
- **HTTP caching:** market and hub pages send `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and
  `Netlify-Vary: cookie=hl_country|hl_theme`; responses that set a cookie (first visit) are `private, no-store`.

## Steps
1. [x] Market core: types, conversion maths, sparkline helpers, cache, CoinGecko + FX + fixture providers, service.
2. [x] `/api/prices` resource route; live poller; PriceChip (live + hover/tap mini chart) and Ticker (live).
3. [x] `/markets` (top 200, sortable, server-paginated, 7d sparkline, sample-data notice).
4. [x] `/markets/:coin` (chart 1D/7D/1M/1Y, stats, price in all supported currencies, related news, AlertCTA UI,
   risk badge when the coin has a contract).
5. [x] Content: country docs (`getCountry`, new `howToBuy` field), `coin` filter on articles.
6. [x] P2P + directory providers; `/local/:country` hubs; homepage local module + article chips use live data.
7. [x] Converter pages for top 50 × launched currencies, 404 without local context; sitemaps for coins, converters, hubs.
8. [x] Tests: conversion in NGN/KES/ZAR/GHS, cache (TTL, stale, single-flight, rate-limit, simulated browsing never
   exceeds the CoinGecko budget), adapters against recorded response shapes, hubs render only from config + CMS,
   converter 404 rules, e2e for new pages, Lighthouse with `/markets`, article JS budget still ≤ 120 KB.

## Results (2026-11-08)
- **Conversion:** BTC tested in NGN, KES, ZAR and GHS against independent FX values (price, formatted string,
  chart series), plus coin↔fiat both ways, P2P premium, and refusal of missing or broken rates.
- **CoinGecko budget:** an hour of simulated browsing (36,000 page views across every page type, 4 currencies,
  50 coins, all chart ranges) stays at ≤ 25 upstream calls in every minute, and the price list refreshes once a
  minute. Plus unit tests for fresh/stale, single-flight, limiter reserve and Upstash REST.
- **Hubs:** loader output matches each country's CMS doc, only verified exchanges show, unlaunched countries 404,
  and a source scan proves the hub route has no country-specific copy.
- **Adapters** tested against recorded CoinGecko/FX response shapes (demo vs pro host and header, 404, 429).
  This sandbox blocks both APIs, so live calls were not exercised here.
- Unit/DB: 184 tests. E2E: 24 tests (table sort/paginate, coin page + interactive chart, converter content + 404
  rules, hub, live refresh through `/api/prices` with no browser calls to CoinGecko, chip tap/hover, CDN cache
  headers, no hydration errors). Lighthouse: `/markets` 100/100/100/100, article 100, budget 119.8 KB.

## Carry-over
- Local events on hubs: no data source yet (directory `event` entries, Phase 7).
- Admin P2P rate entry: Phase 7 (SQL until then).
- Article JS headroom is 0.2 KB (decision 41).
