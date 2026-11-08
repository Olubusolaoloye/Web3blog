# Phase 4 — Lead capture

Status: **done**

## Goal
Every capture actually captures: newsletter sign-ups stored and sent to beehiiv with source + UTM, analytics events,
the thank-you flow with a community CTA, a flagged exit-intent modal, and the B2B side (partners hub, packages from
the CMS, booking → lead + order + team notification, media kit).

## Design
- **Adapters with real and in-memory implementations** (same pattern as content/market):
  `SubscriberStore` / `LeadStore` (Supabase service role | memory), `NewsletterProvider` (beehiiv | none),
  `Notifier` (Telegram + Slack + Resend email | in-memory outbox), `PaymentProvider` (manual invoice),
  `RateLimiter` (Upstash REST | memory). Without credentials everything still works locally and in e2e.
- **E2E inspection:** with `E2E_TEST_MODE=1` (and no Supabase configured) `/api/test-outbox` exposes the in-memory
  rows and notifications so Playwright can check "the row appears with the correct source". 404 otherwise.
- **UTM:** first-touch `hl_utm` cookie (30 days) set in the root loader when a request carries `utm_*` params;
  stored with every subscriber and lead.
- **Spam protection:** Zod validation, honeypot field, per-IP rate limits (subscribe 5 / 10 min, leads 3 / hour),
  link-count check on free-text, generic errors for bots.
- **Bundle budget (article 119.2 / 120 KB):** analytics, exit-intent and the sticky footer load lazily or live
  only on non-article pages. Nothing heavy joins the shared chunk.

## Steps
1. [x] Capture core: request helpers (IP, UTM cookie), rate limiter, stores, beehiiv adapter, notifier, payment.
2. [x] `/api/subscribe`: validate → rate limit → store (first source wins) → beehiiv → status; returns ok.
3. [x] Client: analytics (`track`, pageviews; GA4 + PostHog loaded after idle), `subscribe` event, thank-you CTA,
   `sticky-footer` variant, AlertCTA captures email (source `alert-cta:<path>`), exit-intent modal behind `exitIntent`.
4. [x] CMS: `package` and `partnerSettings` schemas + fixtures (8 packages from §7.12), content source methods.
5. [x] `/partners`: stats, countries, formats, public price list, booking form (route action) → lead + order (price from
   CMS, never the client) → manual invoice ref → confirmation email + team Telegram/Slack/email. Media kit PDF.
6. [x] Tests: unit (schemas, limiter, stores, adapters with mocked fetch, actions incl. spam), DB test for the
   insert policies, e2e (subscribe from an article → row with the right source + UTM; booking → lead + order +
   notification; honeypot and rate limit), budget + Lighthouse.

## Results (2026-11-08)
- **Subscribe from an article (e2e):** the row is stored with `source = end-of-article:/news/<slug>`, the country and
  the first-touch UTM from the landing URL; the inline box and the AlertCTA record their own sources.
- **B2B booking (e2e + unit):** one `b2b_leads` row + one `pending` order priced from the CMS, a manual invoice
  reference, a team notification (Telegram/Slack/email adapters mocked with fetch in unit tests, outbox in e2e)
  and a confirmation email.
- **Spam protection:** honeypots (generic error, nothing stored), per-IP rate limits (429 after 5 sign-ups / 3
  bookings), link-stuffing and URL checks, tampered prices ignored. Tested in unit and e2e.
- 211 unit/DB tests, 33 e2e tests. Lighthouse: `/partners` 100 across the board; article JS 119.9 KB.
- Found and fixed along the way: a booking-form accessibility bug (labels wrapping selects leaked option text into
  the accessible name), spoofable client-IP headers, and an e2e race (reload before the theme cookie was saved).

## Carry-over
- beehiiv, Resend, Telegram and Slack were exercised with mocked HTTP only (no credentials or network here).
- Admin views of subscribers/leads/orders and CSV export: Phase 7.
- Real prices, audience numbers and media kit: content work in the Studio.
