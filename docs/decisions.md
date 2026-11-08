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
