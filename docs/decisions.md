# Decisions log

Newest last. Each entry: what, why, and how to revisit.

## 2026-11-08 — Phase 1

1. **Pinned majors to the spec, not to "latest".** npm's latest is React Router 8 and Sanity 6. CLAUDE.md §2 says
   React Router v7 and Sanity v3, so we pin `react-router@7.18.x` and `sanity@3.99.x`. Vite 7, TypeScript 5.9,
   Vitest 3, ESLint 9 were picked because they are the newest majors those two support. Upgrade as a deliberate task.
2. **Scaffolded by hand instead of `pnpm create react-router@latest`.** The CLI is interactive and would pull v8.
   The result matches the official template (entry files, `react-router.config.ts`, `routes.ts`).
3. **Flat file routes** via `@react-router/fs-routes` (`flatRoutes()`), so file names in `src/app/routes` match §3.
   Extra dependency, needed to use the file names listed in §3.
4. **404 route is `_site.$.tsx`, not `$.tsx`.** Keeps the 404 inside the public layout (header, ticker, footer, capture).
5. **Fixture content source.** When `VITE_SANITY_PROJECT_ID` is empty the app reads seed fixtures from
   `src/lib/content/fixtures`. The same fixtures are exported as NDJSON for `sanity dataset import`, so local dev
   and the seeded dataset hold the same content. Once Sanity is configured, the GROQ source is used automatically.
6. **Seed hero images are local SVG placeholders** (`public/placeholders/*.svg`, 1600×900) so the seed has no
   third-party image licensing questions. The export script uploads them via `_sanityAsset: image@file://…`.
7. **`country.recommendedExchanges` stores directory slugs (strings), not Sanity references.** Directory entries live
   in Supabase (§6), so a Sanity reference can't point at them. Slugs resolve against `directory_entries.slug`.
8. **"No sponsored posts in editorial lists"** is enforced structurally: every editorial reference field
   (`siteSettings` homepage modules, `related`, corrections) is typed `to: [{type: 'article'}]` only, and the app's
   editorial queries only ever select `_type == "article"`.
9. **Currency follows country.** `hl_country` alone drives the displayed fiat (NGN/KES/ZAR/GHS). A separate currency
   override can be added later without changing the cookie.
10. **Locale-correct number formatting** via `Intl.NumberFormat` with the country locale (e.g. `en-ZA` prints
    `R 98,2M`). That is how South Africans read prices; revisit if user research says otherwise.
11. **Supabase types are hand-written** in `src/lib/supabase/database.types.ts` to mirror `0001_init.sql`, because no
    project is linked yet. `pnpm db:types` overwrites them from the live schema.
12. **Migration test runs on plain Postgres 16** with a small stub of Supabase's `auth` schema and roles
    (`tests/db/supabase-stub.sql`). It checks that the SQL applies and that RLS is enabled on every public table.
    It skips itself if `psql`/a local server is not available.
13. **Theme toggle posts to `/api/theme`** (a resource-route action that sets `hl_theme`). Works without JS. With JS
    the `data-theme` attribute is updated optimistically.
14. **shadcn/ui** is set up with `components.json` + `cn()` and only the `Button` primitive for now; more primitives
    are added as features need them.

## 2026-11-08 — Phase 2

15. **Article bodies are rendered to HTML on the server** (`lib/content/render-body.server.tsx`) and shipped as
    HTML, not as Portable Text plus the renderer. Saves ~4 KB gzip on the article route. Internal links in the body
    still navigate client-side via click delegation (`BodyHtml`). Trade-off: price chips inside the body won't
    live-refresh in Phase 3; the sidebar chips (real React) will.
16. **Removed `tailwind-merge`**; `cn()` is plain `clsx`. Saves ~7 KB gzip on every page. Rule: never pass
    conflicting utilities to one element; branch instead (see `Header`, `SanityImage`).
17. **One shared client chunk for app code** (`manualChunks` in `vite.config.ts`), with JSON-LD builders split out.
    Many tiny chunks compress worse; merging brought the article route from 122 KB to 118.8 KB gzip.
18. **JSON-LD for articles and press posts is built in the loader**, not in `meta`, so the builders never reach the
    article bundle. Static pages still build breadcrumbs in `meta` (separate `jsonld` chunk).
19. **JetBrains Mono is not preloaded.** It only styles numbers and swaps in; preloading it pushed homepage LCP
    past 2.5 s on Lighthouse's slow-4G profile.
20. **`/api/subscribe` validates but does not store yet** (returns 503 "sign-ups open soon"). Storage, beehiiv and
    rate limiting are Phase 4. The forms are real now so every page has its capture component.
21. **Trust pages are SSR, not pre-rendered.** The shared layout shows a per-visitor ticker and country switcher, so
    a pre-rendered page would show Nigerian prices to everyone. Revisit when the ticker refreshes on the client (Phase 3).
22. **Organization JSON-LD uses `NewsMediaOrganization`** (a schema.org Organization subtype) so we can declare
    `publishingPrinciples`, `correctionsPolicy` and `ethicsPolicy`.
23. **Child sitemaps live at `/sitemaps/<section>.xml`** (`sitemaps.$name.ts`). React Router can't mix a param and a
    static suffix in one segment. Sections: `articles`, `pages`; coins, converters, hubs, directory and research join later.
24. **Site search is `/news?q=`** (title + Bottom Line match), and is the WebSite `SearchAction` target. Meilisearch
    replaces the backing query later without changing the URL.
25. **Cache purge adapter (`CachePurger`) with a Netlify implementation.** New env vars `NETLIFY_SITE_ID` and
    `NETLIFY_PURGE_API_TOKEN` (added to `.env.example`). Without them, purges are no-ops. HTML is not CDN-cached
    yet (it varies by `hl_country`), so tags currently cover OG images and sitemaps.
26. **New dependencies:** `satori` + `@resvg/resvg-js` (spec §2, OG images); `@fontsource/space-grotesk` and
    `@fontsource/inter` static `.woff` files (satori can't read woff2), inlined into the server bundle;
    `@lhci/cli` (Lighthouse CI check required by §9).
27. **Lighthouse LCP assertion:** hard ≤ 2.5 s on article pages; warning on `/` and `/news`, which measure 1.9–2.7 s
    on the *slow* 4G profile (harsher than the spec's "4G"). Performance score ≥ 90 is enforced everywhere.
28. **Phase 3 warning:** TanStack Query (~13 KB gzip) would break the article budget (1.2 KB headroom). Use a small
    `setInterval` + `fetch('/api/prices')` hook on the article route, or load TanStack Query only on market pages.

## 2026-11-08 — Phase 3

29. **Image URLs and srcsets are built on the server** (`decorateImages` in `lib/sanity/image.server.ts`, applied
    to every Sanity result). With a real project id the client would otherwise ship `@sanity/image-url`
    (+3 KB gzip), pushing the article route over budget.
30. **One cached upstream call feeds most market UI.** `/coins/markets` (top 250, USD, with 7-day sparklines) is
    cached 60 s; ticker, chips, the table, hubs and converters all derive from it. Local prices = USD × FX
    (open.er-api.com, cached 1 h), so every currency uses one tested conversion path. CoinGecko's own `vs_currency`
    doesn't cover KES or GHS anyway.
31. **No CoinGecko key → sample data**, mirroring the Sanity fallback. The UI labels it ("Sample prices" in the
    ticker, a notice on market pages). 190 of the 200 sample coins are generated placeholders.
32. **Cache design:** fresh/stale windows (serve stale on errors and when rate-limited), in-process single-flight,
    and a per-instance limiter (25 calls/min) with a **reserve of 5** that optional data (charts, coin metadata)
    can't use, so the price list always refreshes. With several server instances, set
    `COINGECKO_MAX_CALLS_PER_MIN` to 25 ÷ instances, or rely on Upstash's shared cache to keep calls low.
33. **Charts:** server-rendered SVG first, then `lightweight-charts` lazy-loaded after hydration (own chunk, only on
    coin pages). The range is a URL param (`?range=1y`), so ranges work without JS and are cacheable.
34. **Converter route file is `_site.markets.$coin_.to.$currency.tsx`** (trailing `_`): without it, flat routes
    nest it inside the coin page, which has no `<Outlet>`.
35. **Converter pages need CMS context.** New `country.howToBuy` field. A page exists only for top-50 coins ×
    launched currencies whose country doc has ≥ 80 characters of how-to-buy copy; otherwise 404 and not in the
    sitemap. URLs are lower-case (`/to/ngn`); other casings 404 rather than duplicating content.
36. **HTML caching:** market, coin, converter and hub pages send `s-maxage=60, stale-while-revalidate=300` with
    `Netlify-Vary: cookie=hl_country|hl_theme`. Any response that sets a cookie is `private, no-store`. The root
    route forwards its Set-Cookie through a `headers` export so children can see it.
37. **P2P rates:** `P2pProvider` interface; Supabase reader (latest row per country/asset) when configured, sample
    rates otherwise. Manual entry happens in SQL until the admin UI (Phase 7). Scraper/API adapters plug in later.
38. **Intl output must match on server and browser.** Node's ICU and Chrome's disagree on default fraction digits
    for compact currency (`₦2.0M` vs `₦2M`), which caused hydration errors. Always pass `minimumFractionDigits`
    explicitly; an e2e test fails on any console error on key pages.
39. **PriceChip mini chart:** CSS hover/focus (works without JS); on touch, the first tap opens it and the second
    follows the link. Body chips are static HTML (decision 15) and don't refresh.
40. **AlertCTA is UI only** and says alerts launch soon. It doesn't capture anything until Phase 4/6.
41. **Article JS is at 119.8 KB gzip (budget 120).** React DOM + React Router are ~110 KB of it. Phase 4 must load
    analytics (GA4/PostHog) after idle, outside the preloaded route bundle, and keep new article-page UI tiny.

## 2026-11-08 — Phase 4

42. **The footer is server-rendered HTML** (`lib/layout/footer-html.server.tsx`), shown via `BodyHtml`, and its link
    data moved to `config/footer.ts` (server only). It's static, so hydrating it only cost bytes.
43. **Vite's dynamic-import preload helper is off** (`build.modulePreload: false`). React Router already preloads
    route modules; the helper added 0.6 KB to every page once lazy imports existed.
44. **Non-critical client code is one lazy chunk** (`lib/client/enhance.ts`), imported after hydration: pageview
    analytics and arming the exit-intent modal. Components call a ~100-byte `track()` stub that imports the analytics
    client on first use. The exit-intent modal is built with plain DOM APIs, so it doesn't pull `react-dom/client`
    into a separate chunk. The article route stays at 119.9 KB gzip.
45. **PostHog without its SDK.** Events go to PostHog's HTTP capture API (`sendBeacon`), and feature flags come from
    `/decide`, falling back to `config/flags.ts`. GA4's gtag loads after `requestIdleCallback`. Both are off when
    their env vars are empty.
46. **Capture adapters, same pattern as content/market:** Supabase (service role, server only) or in-memory stores;
    beehiiv or none; Telegram/Slack/Resend or an in-memory outbox; manual invoices; Upstash or memory rate limits.
    With nothing configured, everything still works locally.
47. **First capture wins.** Re-subscribing never duplicates a row, never overwrites the original `source`/UTM, and
    always returns success (no email enumeration). If beehiiv fails the row stays `pending` for a later re-sync.
48. **Rate limits trust exactly one IP header** (`TRUSTED_IP_HEADER`, default Netlify's
    `x-nf-client-connection-ip`). `x-forwarded-for` and friends are ignored because clients can forge them.
    Limits: subscribe 5 / 10 min, booking 3 / hour, per IP.
49. **E2E inspection endpoint** `/api/test-outbox`: answers only with `E2E_TEST_MODE=1` *and* in-memory stores; it
    404s whenever a real database is configured. This is how Playwright checks the stored row and notifications.
50. **Bookings take the price from the CMS package**, never from the form; tampered price fields are ignored. Manual
    invoice references (`INV-YYYYMMDD-XXXXXX`) are stored as `orders.payment_ref`.
51. **Media kit:** a generated `public/media-kit.pdf` (`pnpm media-kit`, Playwright print of the partners content).
    An uploaded PDF on the Sanity "Partners hub settings" document takes precedence.
52. **AlertCTA captures a newsletter sign-up** with interest `price-alerts` and source `alert-cta:<path>` until real
    alerts ship in Phase 6, and says so.
53. **Sticky-footer variant** appears on `/markets` and hubs after scrolling (dismissed for 7 days), not on articles,
    which already have inline + end-of-article boxes.
54. **New env vars:** `EMAIL_FROM`, `TEAM_NOTIFY_EMAIL`, `SLACK_WEBHOOK_URL`, `TRUSTED_IP_HEADER`, `E2E_TEST_MODE`.
55. **Placeholder business numbers:** package prices and audience stats in the fixtures are placeholders, labelled on
    the page and in the PDF. Set real values in the Studio (`package` docs, "Partners hub settings").
