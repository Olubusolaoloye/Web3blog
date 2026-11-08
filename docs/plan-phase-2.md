# Phase 2 — News and Trust

Status: **done**

## Goal
Complete editorial surface (homepage, news index, full article page, authors, `/press`, trust pages), the
revalidation webhook, and the full SEO layer from CLAUDE.md §9.

## Steps
1. [x] Content layer: extend `ContentSource` (paging, category/author filters, related stories, authors, categories,
   sponsored posts, corrections, articles since a date). Fixtures gain 2 sponsored posts (1 `noindex`) and a correction.
   Sanity GROQ equivalents. Editorial queries stay `_type == "article"` only.
2. [x] JSON-LD builders in `lib/seo/jsonld.ts`: Organization, WebSite (+SearchAction), NewsArticle, Article,
   BreadcrumbList, FAQPage, Dataset, Person. A local validator test that applies Google's required/recommended
   properties for NewsArticle (the "Rich Results" bar).
3. [x] Components: `Breadcrumbs` (+ BreadcrumbList; JSON-LD is emitted via `meta`), `ShareButtons` (WhatsApp first, text = Bottom Line),
   `RelatedStories`, `NewsletterBox` (UI variants; the action validates input and is wired to storage in Phase 4).
4. [x] Routes: homepage modules (§7.1, market modules mocked), `/news` (category filter, `?q=` search, pagination),
   article page complete (§7.2), `/authors/:slug`, `/press` + `/press/:slug`, trust pages (§7.13).
5. [x] SEO resource routes: `sitemap.xml` (index) + child sitemaps, `news-sitemap.xml`, `robots.txt`, `llms.txt`,
   `og/:type/:slug` (satori + resvg, cached 1 day).
6. [x] `/api/revalidate`: verifies Sanity's webhook signature (HMAC, `SANITY_REVALIDATE_SECRET`), purges cache tags
   for the article, homepage and sitemaps through a `CachePurger` adapter (Netlify implementation + no-op).
7. [x] Performance: article-route JS ≤ 120 KB gzip (budget test over the build manifest), Lighthouse mobile ≥ 90 on an
   article page (Lighthouse CI config + local run).
8. [x] Tests: sponsored posts never in editorial lists (unit), JSON-LD validation, sitemap/robots, webhook signature,
   e2e raw-HTML checks for JSON-LD and new pages.

## Scope notes
- Research highlight and Directory "Featured" strip on the homepage render only when data exists (Research = Phase 7,
  Directory = Phase 7). No placeholder content pretending to be real.
- Local hub links/sitemap entries are added in Phase 3 when `/local/:country` exists.

## Results (2026-11-08)
- Unit + DB: 131 tests pass (JSON-LD rich-results checks for all 10 articles, sponsored separation across every list
  filter, related stories and GROQ queries, sitemaps/robots/llms, webhook signatures, OG rendering, capture validation).
- E2E: 14 Playwright tests pass, including raw-HTML JSON-LD, press labelling and `rel="sponsored nofollow"`, the
  editorial/sponsored separation on real pages, and the **article JS budget: 118.8 KB gzip** (≤ 120).
- Lighthouse CI (mobile, simulated slow 4G, 3 runs): performance 96–100, accessibility/SEO/best practices 100.
  Article page LCP ≈ 0.77 s, CLS 0.001.

## Carry-over
- Homepage and `/news` LCP vary 1.9–2.7 s on slow 4G (image-led). Ideas for Phase 3/8: inline a tiny LQIP for the
  first image, serve AVIF from the Sanity CDN, consider dropping the Inter preload.
- `/markets` joins the Lighthouse URL list once it exists (Phase 3).
- Research highlight + Directory strip on the homepage: Phase 7.
- Trust pages are SSR, not pre-rendered (decision 21).
- Legal pages (privacy, terms) are drafts and need legal review before launch.
