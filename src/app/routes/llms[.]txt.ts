import { launchedCountries } from "~/config/countries";
import { site } from "~/config/site";
import { absoluteUrl } from "~/lib/seo/meta";

/** llms.txt (https://llmstxt.org): a plain-language map of the site for AI assistants. */
export function llmsTxt(): string {
  const countries = launchedCountries.map((c) => `${c.name} (${c.currency})`).join(", ");
  return `# ${site.name}

> ${site.tagline} ${site.description}

Coverage: ${countries}. Every news story lists its sources and opens with "The Bottom Line" (up to three key points).
Sponsored content and press releases are labelled and live only under /press. We publish no gambling, betting or loan content.

## Key sections
- [News](${absoluteUrl("/news")}): sourced crypto news for emerging markets
- [Safety Desk](${absoluteUrl("/safety")}): scam alerts and token risk checks
- [Markets](${absoluteUrl("/markets")}): prices in local currencies
- [Learn](${absoluteUrl("/learn")}): beginner courses

## Trust
- [Editorial standards](${absoluteUrl("/standards")}): sourcing, corrections, sponsored content, AI use and no-gambling policies
- [Corrections](${absoluteUrl("/corrections")})
- [About](${absoluteUrl("/about")})

## Research
- [Research reports](${absoluteUrl("/research")})

## Optional
- [Sitemap](${absoluteUrl("/sitemap.xml")})
- [Press releases and sponsored content](${absoluteUrl("/press")})
`;
}

export function loader() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
