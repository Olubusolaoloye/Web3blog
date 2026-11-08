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
4. Revalidation webhook (Phase 2): GROQ webhook on publish → `POST /api/revalidate` with `SANITY_REVALIDATE_SECRET`.

### Connect Supabase
```bash
supabase link --project-ref <ref>
supabase db push                # applies supabase/migrations
pnpm db:types                   # regenerates src/lib/supabase/database.types.ts
```

## Checks
```bash
pnpm lint && pnpm typecheck && pnpm test   # before every commit
pnpm test:e2e                              # builds, serves, runs Playwright (mobile profile)
```
`tests/db` applies the migrations to a temporary database on a local Postgres (`PG_TEST_URL`, default
`postgres://postgres:postgres@localhost:5432/postgres`) and checks RLS. It skips when no server is reachable.
