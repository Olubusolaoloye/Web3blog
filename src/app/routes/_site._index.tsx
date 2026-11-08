import { Link } from "react-router";
import type { Route } from "./+types/_site._index";
import { ArticleCard } from "~/components/article/ArticleCard";
import { HeroStory } from "~/components/article/HeroStory";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { PriceChip } from "~/components/market/PriceChip";
import { site } from "~/config/site";
import { getContentSource } from "~/lib/content/source.server";
import { resolveCountry } from "~/lib/country.server";
import { formatDateTime } from "~/lib/dates";
import { formatPrice } from "~/lib/market/format";
import { safeP2p } from "~/lib/market/p2p.server";
import { safeQuotes } from "~/lib/market/service.server";
import { graph, organizationJsonLd, websiteJsonLd } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

export function meta(_: Route.MetaArgs) {
  return buildMeta({
    title: `${site.name}: ${site.tagline}`,
    rawTitle: true,
    path: "/",
    jsonLd: graph(organizationJsonLd(), websiteJsonLd()),
  });
}

/**
 * Homepage (CLAUDE.md §7.1). Editorial modules read `listArticles`, which only returns `article` docs,
 * so sponsored posts can never appear here. Market modules read the cached market service and P2P provider.
 * Research highlight and Directory "Featured" strip are added with their data in Phase 7.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const content = getContentSource();
  const country = await resolveCountry(request);
  const [latest, breaking, safety, local, quotes, p2p] = await Promise.all([
    content.listArticles({ limit: 8 }),
    content.listArticles({ limit: 20 }).then((r) => r.items.find((a) => a.isBreaking)),
    content.listArticles({ type: "safety", limit: 3 }),
    content.listArticles({ country: country.code, limit: 1 }),
    safeQuotes(country.currency, ["bitcoin", "tether"]),
    safeP2p(country.code),
  ]);
  const hero = breaking ?? latest.items[0];
  const topStories = latest.items.filter((a) => a.slug !== hero?.slug).slice(0, 6);
  return {
    hero,
    topStories,
    safety: safety.items,
    localHub: {
      countryCode: country.code,
      countryName: country.name,
      flag: country.flag,
      locale: country.locale,
      quotes,
      p2p,
      story: local.items[0],
    },
  };
}

const tools = [
  { name: "Token scanner", text: "Check a contract for honeypots, hidden mints and other red flags before you buy." },
  { name: "Price alerts", text: "Get a Telegram, WhatsApp or email ping when a coin hits your price in your currency." },
  { name: "Calculators", text: "Profit, DCA and tax estimates in naira, shillings, rand or cedis." },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { hero, topStories, safety, localHub } = loaderData;
  return (
    <div className="container-content space-y-12 py-6 sm:py-8">
      <h1 className="sr-only">
        {site.name}: {site.tagline}
      </h1>

      {hero ? <HeroStory article={hero} /> : <p className="text-muted">No stories yet.</p>}

      {topStories.length > 0 ? (
        <section aria-labelledby="top-stories" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="top-stories" className="text-xl font-semibold">Top stories</h2>
            <Link to="/news" className="text-sm text-signal-ink underline">All news</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topStories.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="local-hub" className="rounded-brand border border-border bg-surface p-4 sm:p-6" data-testid="local-hub-module">
        <h2 id="local-hub" className="text-xl font-semibold">
          <span aria-hidden>{localHub.flag}</span> Crypto in {localHub.countryName}
        </h2>
        <p className="mt-1 text-sm">
          <Link to={`/local/${localHub.countryCode}`} className="text-signal-ink underline">
            Open the {localHub.countryName} hub
          </Link>
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted">Local prices</h3>
            <div className="flex flex-wrap gap-2">
              {localHub.quotes.map((q) => (
                <PriceChip key={q.id} quote={q} locale={localHub.locale} />
              ))}
            </div>
          </div>
          {localHub.p2p ? (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted">USDT P2P rate</h3>
              <p className="tabular text-sm">
                Buy {formatPrice(localHub.p2p.buy, localHub.p2p.fiat, localHub.locale)} · Sell{" "}
                {formatPrice(localHub.p2p.sell, localHub.p2p.fiat, localHub.locale)}
              </p>
              <p className="text-xs text-muted">
                {localHub.p2p.source}, updated <time dateTime={localHub.p2p.capturedAt}>{formatDateTime(localHub.p2p.capturedAt)}</time>
              </p>
            </div>
          ) : null}
          {localHub.story ? (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted">Latest local story</h3>
              <Link to={`/news/${localHub.story.slug}`} className="font-semibold hover:text-signal-ink">
                {localHub.story.title}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {safety.length > 0 ? (
        <section aria-labelledby="safety-desk" className="space-y-4" data-testid="safety-strip">
          <h2 id="safety-desk" className="text-xl font-semibold">
            <span className="text-alert">Safety Desk:</span> latest scam alerts
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {safety.map((a) => (
              <li key={a.id} className="rounded-brand border border-border border-l-4 border-l-alert bg-surface p-4">
                <Link to={`/news/${a.slug}`} className="font-semibold hover:text-signal-ink">{a.title}</Link>
                <p className="mt-1 text-sm text-muted">{a.bottomLine[0]}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="tools" className="space-y-4">
        <h2 id="tools" className="text-xl font-semibold">Tools</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {tools.map((t) => (
            <li key={t.name} className="rounded-brand border border-border bg-surface p-4">
              <p className="flex items-center justify-between font-semibold">
                {t.name}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">Coming soon</span>
              </p>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <NewsletterBox variant="homepage" country={localHub.countryCode} />
    </div>
  );
}
