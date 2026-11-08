# Phase 1 — Foundation

Status: **done** (except the account-dependent steps below)

## Goal
A running React Router v7 SSR app with the brand shell (tokens, fonts, theme, header, footer, ticker), the full
Sanity schema set in a separate Studio app, seed content, and the Supabase schema with RLS.

## Steps
1. [x] Workspace: `pnpm-workspace.yaml` (`.` + `studio`), root `package.json` scripts from CLAUDE.md §12, `.env.example`.
2. [x] React Router v7 (framework mode, `ssr: true`, `appDirectory: src/app`), flat file routes via `@react-router/fs-routes`.
3. [x] Tailwind v4 via Vite plugin; tokens in `src/styles/globals.css` (dark default + derived light set, AA contrast).
4. [x] Fonts: `@fontsource-variable/{space-grotesk,inter,jetbrains-mono}`, latin woff2 preloaded from the root `links` export.
5. [x] Theme: `hl_theme` cookie (`system | light | dark`) read in the root loader → `data-theme` on `<html>` in SSR (no flash).
   `system` uses `prefers-color-scheme` in CSS only, so no JS is needed for the first paint.
6. [x] Config: `site.ts` (only place the brand name lives), `countries.ts` (ng/ke/za/gh launched, in/ph staged), `flags.ts`.
7. [x] Country: `hl_country` cookie; first visit detected from CDN geo headers (Netlify, Vercel, Cloudflare), fallback `ng`.
8. [x] Layout: Header (nav, CountrySwitcher, ThemeToggle), Ticker (mocked top-10 in local currency), Footer.
9. [x] Signature components available for articles: BottomLine, SourceList, AuthorCard, SafetyBadge, SponsoredLabel, PriceChip (static; live refresh is Phase 3).
10. [x] Content layer `src/lib/content/`: a `ContentSource` interface with a Sanity (GROQ) implementation and a local
    fixture implementation used when `VITE_SANITY_PROJECT_ID` is unset, so the app runs with zero credentials.
11. [x] `/news/:slug` renders BottomLine → hero → body (Portable Text with custom blocks) → SourceList → AuthorCard.
12. [x] Studio app in `/studio` with every schema from CLAUDE.md §5 and the editorial validation rules.
13. [x] Seed: 10 articles, 3 authors, 4 countries (plus categories/tags) as TS fixtures, exported to NDJSON for
    `sanity dataset import` via `pnpm --filter studio seed:export`.
14. [x] Supabase: `supabase/migrations/0001_init.sql` (all §6 tables, RLS on everywhere, policies), `seed.sql`,
    hand-written `database.types.ts` (regenerate with `pnpm db:types` once linked), server + browser clients.
15. [x] Tests: unit (format, geo, cookies, content rules, components), migration test against local Postgres with stubbed
    `auth` schema, Playwright SSR test that reads the raw article HTML.

## Not done in this phase (needs the owner's accounts)
- Creating/linking the real Supabase project (`supabase link`), then `supabase db push` and `pnpm db:types`.
- Creating the Sanity project, then `pnpm --filter studio seed` to import the seed dataset.

## Acceptance check
- `pnpm dev` serves the site; `pnpm --filter studio dev` opens the Studio.
- `/news/<slug>` shows BottomLine, SourceList, AuthorCard (verified by the Playwright raw-HTML test).
- `pnpm lint && pnpm typecheck && pnpm test` pass.

## Results (2026-11-08)
- `pnpm lint`, `pnpm typecheck` (app + studio), `pnpm test` (61 unit + DB/RLS tests) and `pnpm test:e2e` (6 tests) pass.
- `pnpm dev` serves the site; `pnpm --filter studio dev` serves the Studio; `sanity schema validate` reports no errors.
- `sanity schema extract` / TypeGen need a real project (the CLI calls the Sanity API), so `sanity.types.ts` is not generated yet.

## Carry-over for Phase 2
- **JS budget:** the article route currently ships ~131 KB gzip (React DOM + router ≈ 112 KB of that). The budget is
  120 KB. Phase 2 must trim it: look at the `utils` chunk (Portable Text renderer + tailwind-merge) first.
- No `Cache-Control` headers yet: HTML varies by `hl_country`, so CDN caching needs `Vary`/edge handling (Phase 3).
- Breadcrumb JSON-LD, NewsletterBox, share buttons and related stories come with the full article page in Phase 2.
