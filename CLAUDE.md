# CLAUDE.md — Hashline Build Spec

> Build brief for Claude Code. Read this whole file before writing any code.
> Working brand name: **Hashline**, tagline "Crypto, clearly." The name is not final, so keep it in one config file (`src/config/site.ts`) and never hard-code it elsewhere.

---

## 0. How to work on this project

- Build in the **phases** listed in section 10, in order. Finish each phase's acceptance criteria before you start the next.
- Before you start a phase, write a short plan to `docs/plan-phase-N.md`. Update it as you go.
- Commit after each working feature with a clear message (`feat: local price chip`, `fix: alert cron timezone`).
- Run `pnpm lint && pnpm typecheck && pnpm test` before every commit. Never commit failing code.
- If a requirement is unclear, choose the simplest option that meets the acceptance criteria, note the decision in `docs/decisions.md`, and keep going.
- Don't add libraries that aren't listed in section 2 unless there's a clear need. Record why in `docs/decisions.md`.
- Never commit secrets. Every key goes in `.env.local`, and `.env.example` lists them with no values.
- Use TypeScript `strict`. No `any` unless a comment explains why.

---

## 1. What we're building

Hashline is a crypto news and tools platform for **emerging markets**. It launches with Africa (Nigeria, Kenya, South Africa, Ghana) and then expands to India and the Philippines.

It competes with Coinpedia by being:
1. **Local:** prices in local currency, P2P rates, regulation by country.
2. **Useful:** tools (risk scanner, calculators, alerts), not just articles.
3. **Trustworthy:** sourced news, labelled sponsored content, a Safety Desk. No gambling content, ever.
4. **Owned-audience first:** every page pushes toward newsletter, WhatsApp or Telegram sign-up.
5. **A B2B lead machine:** a self-serve partners hub, directory listings and PR booking.

### Main user types
| User | Wants | Key surfaces |
|---|---|---|
| Reader (beginner–intermediate) | Fast news, local prices, safety | News, Markets, Local hubs, Safety, Newsletter |
| Active trader | Alerts, P2P rates, data | Markets, Tools, Alerts |
| Crypto project / business | Visibility, leads in emerging markets | Partners hub, Directory, PR booking |
| Editor / writer (internal) | Publish quickly with standards | CMS (Sanity Studio) |
| Admin (internal) | Manage leads, listings, alerts | `/admin` dashboard |

---

## 2. Tech stack (use exactly this unless noted)

| Layer | Choice |
|---|---|
| Framework | **React 19 + Vite + TypeScript**, routed with **React Router v7 in framework mode with SSR on** (`ssr: true`). **Do NOT use Next.js anywhere in this project.** |
| Why SSR | News pages must be fully rendered HTML for Google, Google News, Discover and social previews. React Router's `loader` (server data), `meta` (SEO tags) and resource routes (APIs, sitemaps, OG images) cover this without Next.js. Static pages (about, standards, tools shells) are pre-rendered with the `prerender` option. |
| Styling | **Tailwind CSS v4** (Vite plugin) + CSS variables for design tokens; `shadcn/ui` for primitives |
| CMS | **Sanity v3**, with Studio as a **separate app** in `/studio` (deployed with `sanity deploy` to `<name>.sanity.studio`), GROQ queries, TypeGen |
| Database / auth | **Supabase** (Postgres, Auth with email OTP + Google, Row Level Security, **Edge Functions + pg_cron** for scheduled jobs) |
| Market data | **CoinGecko API** (start on the free/demo tier, keep a server-side cache); FX rates from an FX API (e.g. exchangerate.host or open.er-api.com) |
| On-chain / risk | Blockscout API + GoPlus-style token security API; adapter interface so our own ChainLens engine can plug in later |
| Newsletter | **beehiiv** API (subscribe endpoint) |
| Messaging | Telegram Bot API for alerts; WhatsApp Cloud API behind a feature flag (needs Meta approval) |
| Search | Meilisearch (self-host or cloud) or Algolia; behind a `SearchProvider` interface |
| Email (transactional) | Resend |
| Analytics | GA4 + PostHog (feature flags too) |
| Charts | Recharts or lightweight-charts (TradingView) for price charts |
| Validation | Zod |
| Data fetching | Route `loader`s for page data (server); TanStack Query only for live client updates (prices, alerts) |
| Forms / mutations | Route `action`s + Zod validation |
| Images | Sanity image CDN (`@sanity/image-url`) with `srcset`, AVIF/WebP, explicit width/height, `loading="lazy"` except the hero |
| OG images | `satori` + `@resvg/resvg-js` in a resource route |
| Head / SEO | React Router `meta` exports + `links` exports |
| Testing | Vitest + Testing Library (unit), Playwright (e2e) |
| Package manager | pnpm |
| Hosting | Netlify (or Vercel) with the React Router adapter; scheduled jobs run in Supabase (pg_cron → Edge Functions) |

---

## 3. Repository structure

```
/
├─ CLAUDE.md
├─ .env.example
├─ docs/
│  ├─ decisions.md
│  └─ plan-phase-N.md
├─ pnpm-workspace.yaml          # workspaces: ".", "studio"
├─ studio/                      # separate Sanity Studio app (own package.json)
│  ├─ schemaTypes/
│  └─ sanity.config.ts
├─ supabase/
│  ├─ migrations/               # SQL migrations (numbered)
│  ├─ functions/                # Edge Functions: alerts-cron, telegram-webhook
│  └─ seed.sql
├─ react-router.config.ts       # ssr: true, prerender list
├─ vite.config.ts
├─ src/   (React Router appDirectory = "src/app")
│  ├─ app/
│  │  ├─ root.tsx               # html shell, Layout, ErrorBoundary, global meta
│  │  ├─ entry.server.tsx  entry.client.tsx
│  │  ├─ routes.ts              # route config (see below)
│  │  └─ routes/
│  │     ├─ _site.tsx           # public layout (Header, Ticker, Footer)
│  │     ├─ _site._index.tsx    # homepage
│  │     ├─ _site.news._index.tsx
│  │     ├─ _site.news.$slug.tsx
│  │     ├─ _site.markets._index.tsx
│  │     ├─ _site.markets.$coin.tsx
│  │     ├─ _site.markets.$coin.to.$currency.tsx
│  │     ├─ _site.local.$country.tsx
│  │     ├─ _site.safety._index.tsx
│  │     ├─ _site.safety.scanner.tsx
│  │     ├─ _site.safety.airdrops.tsx
│  │     ├─ _site.tools.$tool.tsx
│  │     ├─ _site.learn.*.tsx
│  │     ├─ _site.research.$slug.tsx
│  │     ├─ _site.directory.*.tsx
│  │     ├─ _site.press.*.tsx          # sponsored + PR (separate section)
│  │     ├─ _site.partners.tsx         # media kit + self-serve booking
│  │     ├─ _site.authors.$slug.tsx
│  │     ├─ _site.about.tsx  _site.standards.tsx  _site.corrections.tsx  _site.contact.tsx
│  │     ├─ _site.subscribe.tsx
│  │     ├─ account.*.tsx              # saved coins, alerts, profile (auth required)
│  │     ├─ admin.*.tsx                # internal dashboard (role-gated)
│  │     ├─ api.*.ts                   # resource routes (no UI): subscribe, leads, scan, revalidate
│  │     ├─ og.$type.$slug.ts          # OG image resource route
│  │     ├─ sitemap[.]xml.ts  news-sitemap[.]xml.ts  robots[.]txt.ts  llms[.]txt.ts
│  │     └─ $.tsx                      # 404 catch-all
│  ├─ components/
│  │  ├─ ui/                    # shadcn primitives
│  │  ├─ article/               # BottomLine, SourceList, SafetyBadge...
│  │  ├─ market/                # PriceChip, PriceTable, Heatmap...
│  │  ├─ capture/               # NewsletterBox, AlertCTA, ExitIntent...
│  │  └─ layout/                # Header, Footer, Ticker, CountrySwitcher
│  ├─ config/
│  │  ├─ site.ts                # brand name, tagline, socials, URLs
│  │  ├─ countries.ts           # supported countries + currencies
│  │  └─ flags.ts
│  ├─ lib/
│  │  ├─ sanity/                # client, queries, image builder
│  │  ├─ supabase/              # server + browser clients
│  │  ├─ market/                # CoinGecko + FX adapters, cache
│  │  ├─ risk/                  # RiskProvider interface + adapters
│  │  ├─ newsletter/            # beehiiv adapter
│  │  ├─ messaging/             # telegram, whatsapp adapters
│  │  ├─ seo/                   # metadata + JSON-LD builders
│  │  └─ analytics/
│  └─ styles/globals.css
└─ tests/ (unit + e2e)
```

---

## 4. Design system

### Tokens (put in `globals.css` as CSS variables, map them in Tailwind)
```css
:root {
  --bg: #0B1020;          /* deep ink navy */
  --surface: #121A30;
  --surface-2: #1A2440;
  --border: #26314F;
  --text: #F5F3EE;        /* warm white */
  --text-muted: #A7AEC2;
  --signal: #C6F432;      /* electric lime: CTAs, highlights */
  --alert: #FF6B57;       /* coral: scam warnings, price down */
  --up: #3DDC97;          /* price up */
  --down: #FF6B57;
  --warning: #FFC24B;
  --radius: 12px;
}
```
- A **light mode** is required too (toggle + `prefers-color-scheme`). Derive the light tokens yourself and keep contrast at WCAG AA or better.
- **Fonts** (self-hosted with `@fontsource-variable/*`, preloaded via route `links`, `font-display: swap`): headlines **Space Grotesk**, body **Inter**, prices and data **JetBrains Mono**.
- Use an 8px spacing scale; content max width 1200px; article body max width 720px.
- Mobile first: most users are on Android phones on slower networks. Test at 360px width.

### Signature components (build these first; they define the brand)
| Component | Spec |
|---|---|
| `BottomLine` | Box at the top of every article: 3 bullets max, lime left border, label "The Bottom Line" |
| `PriceChip` | Inline chip `BTC ₦98.2M ▲2.1%`; shows the user's selected local currency; hover/tap gives a mini chart; server-rendered with periodic client refresh |
| `SafetyBadge` | Shows risk level (Low / Medium / High / Unknown) with icon + colour; links to the full scan |
| `SourceList` | "Sources" list at the end of every article (required field in the CMS) |
| `SponsoredLabel` | Clear "Sponsored" / "Press Release" banner, plus a disclosure line |
| `NewsletterBox` | Inline sign-up: email + country select; variants `inline`, `sticky-footer`, `end-of-article` |
| `AlertCTA` | "Alert me when BTC hits ₦___" with a Telegram/WhatsApp/email option; asks the user to sign up if needed |
| `CountrySwitcher` | Header control that sets country + currency (cookie `hl_country`); auto-detected by geo-IP on first visit |
| `Ticker` | Thin top bar of the top 10 coins in local currency |
| `AuthorCard` | Photo, name, role, expertise, holdings disclosure link |

---

## 5. Content model (Sanity)

Create these schema types with validation:

- **article**: `title`, `slug`, `type` (news | analysis | local | safety | learn | research), `bottomLine` (array of 1–3 strings, **required**), `body` (Portable Text with custom blocks: priceChip, callout, embedTweet, chart, safetyBadge), `sources` (array of {label, url}, **min 1 required for news**), `authors` (refs), `editor` (ref), `countries` (refs, optional), `coins` (array of CoinGecko ids), `category` (ref), `tags`, `heroImage` (required, min 1200px wide, alt text required), `publishedAt`, `updatedAt`, `isBreaking`, `seo` ({title, description, ogImage}), `faq` (optional Q&A array for schema)
- **sponsoredPost**: same as article, plus `sponsorName`, `disclosureText`, `kind` (sponsored | pressRelease), `noindex` (bool, default false), `linksRel` fixed to `sponsored nofollow`. Rendered **only** under `/press`.
- **author**: `name`, `slug`, `photo`, `role`, `bio`, `expertise`, `holdingsDisclosure`, `socials`
- **country**: `name`, `code` (ISO-2), `currency` (ISO-4217), `flag`, `regulationStatus` (rich text), `regulationUpdatedAt`, `taxGuide` (rich text), `recommendedExchanges` (refs to directory entries), `hubIntro`
- **category**, **tag**
- **course** / **lesson** / **quiz** (for Learn)
- **researchReport**: `title`, `summary`, `pdf` (file), `gated` (bool), `charts`, `methodology`
- **correction**: `article` (ref), `date`, `note` (feeds the `/corrections` page)
- **siteSettings** (singleton): nav, footer, homepage modules, announcement bar

Editorial rules enforced in Studio:
- News cannot be published without at least 1 source and a Bottom Line.
- `sponsoredPost` cannot be referenced from editorial lists.
- Publishing an article triggers a webhook to `/api/revalidate` (protected by a secret), which purges the CDN cache for that article, the homepage and the sitemaps.

---

## 6. Database (Supabase)

Write numbered SQL migrations. **Turn on RLS for every table.**

```sql
profiles (id uuid pk -> auth.users, display_name, country_code, currency, experience_level text check in ('beginner','intermediate','advanced'), interests text[], role text default 'user' check in ('user','editor','admin'), created_at)

subscribers (id, email unique, country_code, experience_level, interests text[], source text, utm jsonb, beehiiv_id, status text, created_at)
-- source = which capture component / page (e.g. 'end-of-article:/news/slug')

watchlists (id, user_id -> profiles, coin_id text, created_at, unique(user_id, coin_id))

price_alerts (id, user_id, coin_id, currency, direction text check in ('above','below'), target numeric, channel text check in ('email','telegram','whatsapp'), active bool default true, last_triggered_at, created_at)

telegram_links (user_id pk, chat_id bigint unique, linked_at)

risk_scans (id, chain text, contract_address text, result jsonb, risk_level text, provider text, scanned_at, requested_by uuid null, unique(chain, contract_address, provider))

airdrops (id, name, project_url, chain, status text, safety_level text, requirements jsonb, ends_at, verified bool, notes, created_at)

p2p_rates (id, country_code, asset text, fiat text, buy numeric, sell numeric, source text, captured_at)
-- index on (country_code, asset, captured_at desc)

directory_entries (id, slug unique, name, type text check in ('exchange','wallet','project','agency','service','event','professional'), countries text[], website, description, logo_url, tier text default 'free' check in ('free','verified','featured'), kyb_status text default 'none', owner_email, rating_avg numeric, created_at)

directory_reviews (id, entry_id, user_id, rating int check 1..5, body, status text default 'pending', created_at)

b2b_leads (id, name, email, company, website, telegram, service text, budget_range text, countries text[], message, status text default 'new', source text, utm jsonb, created_at)

orders (id, lead_id, package_code text, amount_usd numeric, status text, payment_ref text, created_at)
```

RLS rules:
- Users can read and write only their own `profiles`, `watchlists`, `price_alerts`, `telegram_links`.
- `subscribers`, `b2b_leads` and `orders` are insert-only for anonymous users (through route actions on the server, with rate limiting); only admins can read them.
- `risk_scans`, `airdrops`, `p2p_rates`, `directory_entries` are publicly readable; only service role or admin can write.
- `directory_reviews`: anyone authenticated can insert; only `status = 'approved'` rows are publicly readable.

---

## 7. Pages and features

### 7.1 Homepage `/`
Sections, in order: Ticker → breaking news hero (latest `isBreaking`) → "Top stories" grid → **Local hub module** for the visitor's country (local BTC/USDT price, P2P rate, latest local story) → Safety Desk strip (latest 3 scam alerts) → Tools row (Scanner, Alerts, Calculators) → Newsletter box → Research highlight → Directory "Featured" strip.
- Must reach **LCP < 2.5s on a 4G mobile profile**.

### 7.2 Article `/news/[slug]`
- BottomLine → hero → body → SourceList → AuthorCard → related stories → end-of-article NewsletterBox.
- Every coin mentioned in `coins[]` shows a PriceChip in a sidebar or inline block.
- JSON-LD: `NewsArticle` (headline, datePublished, dateModified, author with url, publisher with logo, image) + `BreadcrumbList` + `FAQPage` if `faq` exists.
- "Reading time" and "Updated" timestamps are shown.
- Share buttons: WhatsApp (first), X, Telegram, copy link. WhatsApp share text uses the Bottom Line.

### 7.3 Markets `/markets` and `/markets/[coin]`
- Table of top 200 coins: price in the selected currency, 24h %, 7d sparkline, market cap. Sortable. Paginated (server-side).
- Coin page: chart (1D/7D/1M/1Y), stats, **local price in all supported currencies**, related news, AlertCTA, risk badge (for tokens with a contract).
- **Converter pages** `/markets/[coin]/to/[currency]` for the top 50 coins × supported currencies. Each needs real unique content: live rate, P2P comparison for that country, short local "how to buy" context pulled from the country doc. **No thin pages:** if there's no local context, don't generate the page (return 404 and leave it out of the sitemap).
- Caching: CoinGecko responses cached server-side (60s for prices, 1h for metadata) in Upstash Redis via `lib/market/cache.ts`, and HTML responses sent with `Cache-Control: s-maxage=60, stale-while-revalidate=300` from route `headers` exports. Never call CoinGecko from the browser; client refreshes go through `/api/prices`.

### 7.4 Local hubs `/local/[country]`
- Hero with country flag, local price board (BTC, ETH, USDT, SOL, BNB), **P2P rate card** (buy/sell, last updated, source), regulation status box (with "last reviewed" date), tax guide, recommended exchanges (from directory, verified only), latest local stories, local events, Telegram/WhatsApp community CTA.
- Supported at launch: `ng`, `ke`, `za`, `gh`. Config-driven so adding `in` and `ph` is just data.

### 7.5 Safety
- `/safety`: scam alert feed (articles of type `safety`), hack tracker table, link to the scanner.
- `/safety/scanner`: form with chain select (Ethereum, BSC, Base, Arbitrum, Polygon, Solana) and contract address → result card. Checks: honeypot, mint authority, ownership renounced, proxy/upgradeable, buy/sell tax, liquidity locked %, top-10 holder concentration, contract verified. Overall risk level plus a plain-English explanation of each flag.
  - Implement `RiskProvider` interface in `lib/risk/` with a `GoPlusProvider` (or equivalent) and a `BlockscoutProvider`, plus a stub `ChainLensProvider` for our future engine.
  - Cache results in `risk_scans` for 6 hours.
  - "Email me this report" → capture email (subscriber with source `scanner`).
  - Rate limit: 10 scans/hour per IP for anonymous users, 50 for logged-in users.
  - Always show the disclaimer: "Automated checks can miss risks. Not financial advice."
- `/safety/airdrops`: verified airdrop list from the `airdrops` table, with safety level, requirements and end date. Filter by chain and status.

### 7.6 Tools `/tools/[tool]`
Build these as client components, with results shareable via URL params:
1. `profit-calculator`: buy price, sell price, amount, fees, local currency.
2. `dca-calculator`: amount, frequency, start date, coin, using historical prices from CoinGecko.
3. `tax-estimator`: per-country simple estimate; reads rules from the country doc. Prominent "estimate only" disclaimer.
4. `staking-compare`: table from a curated JSON/CMS list.
5. `alerts`: manage price alerts (needs login).

### 7.7 Alerts system
- Users create alerts (coin, currency, above/below, target, channel).
- Every 5 minutes, Supabase `pg_cron` calls the Edge Function `alerts-cron` (protected by `CRON_SECRET`). It fetches cached prices, finds triggered alerts, and sends via the channel adapter. Set `last_triggered_at`; deactivate one-shot alerts.
- Telegram linking: `/account/telegram` shows a deep link `t.me/<bot>?start=<signed-token>`; the Edge Function `telegram-webhook` checks the token and saves `chat_id`.
- WhatsApp channel: behind feature flag `whatsappAlerts`.

### 7.8 Learn `/learn`
Courses → lessons → quiz at the end. Progress saved for logged-in users (add a `lesson_progress` table). Completing a course gives a shareable certificate page `/learn/certificate/[id]` with an OG image.

### 7.9 Research `/research/[slug]`
Report summary page with key charts. If `gated`, the full PDF needs email (creates a subscriber with source `research:<slug>`), then a download link is sent by email (Resend) and shown on screen.

### 7.10 Directory `/directory`
- List and filter by type and country; entry pages `/directory/[slug]` with reviews.
- "Get listed" form → creates a `directory_entries` row (tier `free`, unpublished until an admin approves) **and** a `b2b_leads` row (source `directory`).
- Verified and Featured tiers are shown with badges and sort higher.

### 7.11 Press `/press` (sponsored + PR)
- Separate index and template. `SponsoredLabel` at top. All outbound links `rel="sponsored nofollow"`. Respect `noindex`.
- **Must never** appear in homepage editorial modules, related-stories, or `NewsArticle` JSON-LD (use `Article` instead).

### 7.12 Partners hub `/partners`
- Audience stats (pulled from an admin-editable settings doc), countries, formats.
- **Public price list** of packages (stored in Sanity `package` docs): `pr-basic`, `sponsored-article`, `newsletter-top-slot`, `launch-in-nigeria`, `launch-in-kenya`, `directory-verified`, `directory-featured`, `sponsored-research`.
- Booking form → `b2b_leads` + `orders` (status `pending`) → confirmation email + Slack/Telegram notification to the team (webhook URL in env).
- Payments: leave an adapter interface (`PaymentProvider`) with a manual-invoice implementation for now. Crypto (USDT) and Paystack/Flutterwave can come later.
- Downloadable media kit PDF.

### 7.13 Trust pages
`/about`, `/standards` (editorial policy, sponsored policy, no-gambling policy, AI use policy), `/corrections` (from `correction` docs), `/contact`, `/authors/[slug]`, `/privacy`, `/terms`, `/disclaimer`.

### 7.14 Account `/account`
Profile (country, currency, experience, interests), watchlist, alerts, Telegram link, newsletter preferences, delete account.

### 7.15 Admin `/admin` (role `admin` only)
- Leads table (B2B), with status updates and CSV export.
- Subscribers count by country/source + CSV export.
- Directory approvals and review moderation.
- Airdrops CRUD, P2P rate manual entry/override.
- Orders list.
- Simple KPIs: subscribers today/7d/30d, leads this week, top capture sources.

---

## 8. Lead capture rules (important: this is the business)

- Every public page has **at least one** capture component. Article pages have an inline one (after ~40% of the body) and an end-of-article one.
- Capture forms ask for **email + country**, with optional experience level. Nothing more at first touch.
- Every capture records `source` (component + path) and UTM params (from cookie `hl_utm`, set on first visit).
- On subscribe: insert into `subscribers` → call beehiiv API → fire analytics event `subscribe` with `source` → show a thank-you state with a **WhatsApp/Telegram join** CTA (second capture).
- Exit-intent / scroll-depth modal: show once per 7 days, desktop only, behind flag `exitIntent`.
- Route `action`s validate with Zod, have honeypot fields plus IP rate limiting (e.g. Upstash Ratelimit, or a simple Supabase-backed limiter), and give consent text with a link to the privacy page.
- B2B forms notify the team immediately (Telegram bot message to an internal chat + email).

---

## 9. SEO, performance and AI-search requirements

- **SSR is mandatory for all public content routes.** View-source on an article must show the full headline, Bottom Line, body and JSON-LD before any JS runs (add a test that fetches the raw HTML).
- A `meta` export on every route, built by a `buildMeta()` helper in `lib/seo/`: title `%s | Hashline`, description, canonical, OG and Twitter tags, robots (respect `noindex`).
- Dynamic **OG images** from the `og.$type.$slug` resource route (satori): article title + first Bottom Line bullet + brand. Cache them for 1 day.
- Sitemaps as resource routes returning XML: `sitemap.xml` (index) → articles, coins, converters (only valid ones), local hubs, directory, research; plus `news-sitemap.xml` for articles from the last 2 days with `news:` tags. Exclude `/press` items marked `noindex`.
- `robots.txt`: allow all, disallow `/admin`, `/account`, `/api`; point to the sitemap.
- `llms.txt`: brand description, key sections, links to research and standards pages.
- JSON-LD builders in `lib/seo/` for: `Organization`, `WebSite` (with SearchAction), `NewsArticle`, `Article`, `BreadcrumbList`, `FAQPage`, `Dataset` (research), `Person` (authors).
- Breadcrumbs on all deep pages.
- Images: a shared `<SanityImage>` component that outputs `srcset` from the Sanity CDN in AVIF/WebP, with explicit width/height; `fetchpriority="high"` only on the hero, `loading="lazy"` on the rest.
- Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms on mobile. Add a Lighthouse CI check for `/`, an article page and `/markets`.
- Keep article-page JS small: lazy-load (`React.lazy`) anything beyond PriceChip refresh, share buttons and capture forms. Charts load only on market pages. Article-route JS bundle budget: 120 KB gzip or less.
- **Prohibited:** casino/betting/loans pages, auto-generated thin pages, or editorial pages with paid do-follow links.

---

## 10. Build phases and acceptance criteria

### Phase 1: Foundation
- React Router v7 app on Vite (`pnpm create react-router@latest`, SSR on), Tailwind tokens, fonts, light/dark mode (no flash: set the theme from a cookie in `root.tsx`), Header (with CountrySwitcher), Footer, Ticker (mocked data OK).
- `site.ts`, `countries.ts`, `flags.ts`.
- Sanity Studio app in `/studio` with all schemas from section 5; seed 10 sample articles, 3 authors, 4 countries.
- Supabase project linked; all migrations from section 6 applied; RLS on; typed clients generated.
- **Done when:** `pnpm dev` runs, `pnpm --filter studio dev` opens the Studio, sample articles render at `/news/[slug]` with BottomLine, SourceList and AuthorCard; lint, typecheck and tests pass.

### Phase 2: News and Trust
- Homepage (with mocked market modules), news index with category filters, article page complete, authors, `/press` section, trust pages, revalidation webhook.
- Full SEO from section 9 (metadata, JSON-LD, sitemaps, news sitemap, OG images, robots, llms.txt).
- **Done when:** the Rich Results Test validates NewsArticle on a sample article (no errors in a local JSON-LD validation test), sponsored posts never appear in editorial lists (unit test), and Lighthouse mobile performance is 90+ on article pages.

### Phase 3: Markets and Local
- CoinGecko + FX adapters with caching; PriceChip live; Ticker live; `/markets`, coin pages, valid converter pages.
- Local hubs for ng, ke, za, gh with P2P rate card (manual entry from admin first; scraper/API adapter interface for later).
- **Done when:** prices show correctly in NGN/KES/ZAR/GHS (tested conversion), the CoinGecko rate limit is never hit in normal browsing (cache test), and hubs render from config + CMS data only.

### Phase 4: Lead capture
- NewsletterBox variants, AlertCTA (UI), beehiiv integration, `subscribers` writes, UTM cookie, analytics events, thank-you flow with community CTA, exit-intent modal (flagged).
- B2B: Partners hub, packages from CMS, booking form → leads + orders + notifications, media kit download.
- **Done when:** a Playwright e2e test subscribes from an article and the row appears with the correct `source`; a B2B booking creates a lead + order and triggers the notification (mocked in tests); spam protection is tested.

### Phase 5: Safety and Tools
- RiskProvider interface + adapters; scanner page with caching, rate limits and email report; airdrops page; hack tracker.
- Calculators (profit, DCA, tax estimator, staking compare).
- **Done when:** scanning a known honeypot test contract shows High risk (fixture-based test), scans are cached, and calculators have unit tests for their maths.

### Phase 6: Accounts and Alerts
- Supabase Auth (email OTP + Google), account pages, watchlist, alerts CRUD, Telegram bot linking + webhook, alerts cron, email alerts via Resend.
- **Done when:** an alert above the current price triggers once in a simulated cron run (test) and sends through the Telegram adapter (mocked); RLS tests show user A cannot read user B's alerts.

### Phase 7: Directory, Learn, Research, Admin
- Directory with reviews + moderation, get-listed flow; Learn courses with quizzes, progress and certificates; Research reports with gating; Admin dashboard and CSV exports.
- **Done when:** the full flows work end to end in Playwright, and admin routes return 403 for non-admins.

### Phase 8: Hardening
- Accessibility pass (axe, keyboard navigation, focus states), error and empty states everywhere, `not-found` and `error` pages, logging (Sentry optional), security headers (CSP, HSTS), final Lighthouse CI, README with setup steps.

---

## 11. Environment variables (`.env.example`)

```
# Only VITE_* vars reach the browser. Everything else stays server-only.
VITE_SITE_URL=
VITE_SANITY_PROJECT_ID=
VITE_SANITY_DATASET=production
SANITY_API_READ_TOKEN=
SANITY_REVALIDATE_SECRET=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
COINGECKO_API_KEY=
FX_API_KEY=
GOPLUS_API_KEY=
BLOCKSCOUT_API_KEY=
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_TEAM_CHAT_ID=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
VITE_GA_ID=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
CRON_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 12. Commands

```
pnpm dev            # run locally (react-router dev)
pnpm build          # production build (react-router build)
pnpm start          # serve the production build (react-router-serve)
pnpm --filter studio dev     # run Sanity Studio
pnpm --filter studio deploy  # deploy Studio
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm sanity:typegen # generate Sanity types
pnpm db:types       # supabase gen types typescript
```
Add any missing scripts to `package.json` in Phase 1.

---

## 13. Non-negotiable rules

1. **No gambling, casino, betting or loan content or ads**, anywhere.
2. Sponsored/PR content lives only in `/press`, is always labelled, and its links are always `rel="sponsored nofollow"`.
3. News must have sources and a Bottom Line, enforced in the CMS and checked in a test.
4. Never call third-party APIs from the browser with secret keys; go through server routes with caching.
5. All user data tables use RLS; admin actions are checked on the server.
6. Every financial tool shows "Not financial advice"; the tax tool says "estimate only".
7. Mobile performance is a feature: if a change drops Lighthouse mobile performance below 90 on key pages, fix it before moving on.
8. Keep the brand name only in `src/config/site.ts`.
9. **React only. Never install or use Next.js** (`next`, `next/*`, `@next/*`) or Next-only libraries. Use React Router v7 for routing, data loading and SSR.
