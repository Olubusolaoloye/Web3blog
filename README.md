# Newsroom platform

Crypto news and tools for emerging markets. The brand name and tagline live only in `src/config/site.ts`.
The build spec is in [`CLAUDE.md`](./CLAUDE.md), phase plans are in `docs/plan-phase-N.md`, and decisions are in `docs/decisions.md`.

## Stack
React 19 · React Router v7 (framework mode, SSR) · Vite · Tailwind v4 · Sanity v3 (Studio in `/studio`) · Supabase · Vitest · Playwright.

## Setup
```bash
pnpm install
cp .env.example .env.local      # works with everything empty: content comes from local seed fixtures
pnpm dev                        # http://localhost:5173
pnpm --filter studio dev        # Sanity Studio on http://localhost:3333 (needs studio/.env with a project id to log in)
```

### Connect Sanity
1. Create a project at sanity.io/manage and put its id in `.env.local` (`VITE_SANITY_PROJECT_ID`) and `studio/.env` (`SANITY_STUDIO_PROJECT_ID`).
2. `pnpm --filter studio seed` exports the seed fixtures to NDJSON and imports them, uploading the placeholder images.
3. `pnpm sanity:typegen` generates GROQ result types into `src/lib/sanity/sanity.types.ts`.
4. Revalidation webhook: in sanity.io/manage → API → Webhooks, add a GROQ webhook to `<site>/api/revalidate`
   (create/update/delete, filter `_type in ["article","sponsoredPost","author"]`, projection
   `{_type, "slug": slug.current}`, secret = `SANITY_REVALIDATE_SECRET`). Set `NETLIFY_SITE_ID` and
   `NETLIFY_PURGE_API_TOKEN` so it purges the CDN.

### Market data
Set `COINGECKO_API_KEY` (demo or pro plan, `COINGECKO_API_TIER`) for live prices; without it the site shows
labelled sample data. FX comes from open.er-api.com (or `FX_API_KEY`). Set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` to share the market cache between server instances. P2P rates are rows in `p2p_rates`.

### Lead capture
Sign-ups and bookings are stored in Supabase when `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
(in memory otherwise). Set `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID` to sync subscribers, `TELEGRAM_BOT_TOKEN` +
`TELEGRAM_TEAM_CHAT_ID` and/or `SLACK_WEBHOOK_URL` for team alerts, and `RESEND_API_KEY` + `EMAIL_FROM` (+
`TEAM_NOTIFY_EMAIL`) for email. `pnpm media-kit` regenerates `public/media-kit.pdf`.

### Connect Supabase
```bash
supabase link --project-ref <ref>
supabase db push                # applies supabase/migrations
pnpm db:types                   # regenerates src/lib/supabase/database.types.ts
```

## Checks
```bash
pnpm lint && pnpm typecheck && pnpm test   # before every commit
pnpm test:e2e                              # builds, serves, runs Playwright (mobile profile) incl. the JS budget
pnpm build && pnpm lhci                    # Lighthouse CI: mobile performance ≥ 90 on key pages
```
Without Chrome installed, point Lighthouse at another Chromium: `CHROME_PATH=/path/to/chrome pnpm lhci`.
`tests/db` applies the migrations to a temporary database on a local Postgres (`PG_TEST_URL`, default
`postgres://postgres:postgres@localhost:5432/postgres`) and checks RLS. It skips when no server is reachable.
