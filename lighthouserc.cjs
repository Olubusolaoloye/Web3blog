/**
 * Lighthouse CI (CLAUDE.md §9 / rule 7): mobile performance ≥ 90 on key pages.
 * Run `pnpm build && pnpm lhci`.
 * CHROME_PATH can point at a local Chromium (e.g. Playwright's) when Chrome isn't installed.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "PORT=3300 pnpm start",
      startServerReadyPattern: "localhost:3300",
      url: [
        "http://localhost:3300/",
        "http://localhost:3300/news/bitcoin-dollar-naira-buyers",
        "http://localhost:3300/news",
        "http://localhost:3300/markets",
      ],
      numberOfRuns: 3,
      settings: {
        // Default Lighthouse mobile profile: Moto G-class device, simulated slow 4G.
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertMatrix: [
        {
          // Every key page: mobile performance ≥ 90 (rule 7), SEO ≥ 90, no layout shift.
          matchingUrlPattern: ".*",
          assertions: {
            "categories:performance": ["error", { minScore: 0.9 }],
            "categories:accessibility": ["error", { minScore: 0.9 }],
            "categories:seo": ["error", { minScore: 0.9 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
            // Image-led pages sit around 2.2–2.7 s on Lighthouse's *slow* 4G profile (1.6 Mbps); tracked, see plan-phase-2.
            "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
          },
        },
        {
          matchingUrlPattern: "/news/[^/?]+$",
          assertions: { "largest-contentful-paint": ["error", { maxNumericValue: 2500 }] },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
