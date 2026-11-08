import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { Link } from "react-router";
import type { BodyBlock } from "~/lib/content/types";
import type { LocalQuote } from "~/lib/market/types";
import { PriceChip } from "~/components/market/PriceChip";
import { SafetyBadge, type RiskLevel } from "./SafetyBadge";
import { cn } from "~/lib/utils";

interface Props {
  value: BodyBlock[];
  /** Quotes for priceChip blocks, keyed by CoinGecko id. */
  quotes: Record<string, LocalQuote>;
  locale: string;
  /** Sponsored bodies get rel="sponsored nofollow" on every outbound link. */
  sponsored?: boolean;
}

const calloutTone: Record<string, string> = {
  info: "border-signal-ink",
  warning: "border-warning",
  danger: "border-alert",
};

const riskLevels: readonly RiskLevel[] = ["low", "medium", "high", "unknown"];

export function PortableBody({ value, quotes, locale, sponsored = false }: Props) {
  const components: PortableTextComponents = {
    types: {
      priceChip: ({ value: v }: { value: { coinId?: string } }) => {
        const q = v.coinId ? quotes[v.coinId] : undefined;
        return q ? (
          <p>
            {/* Body HTML is rendered once on the server, so these chips don't live-refresh (decision 15). */}
            <PriceChip quote={q} locale={locale} live={false} />
          </p>
        ) : null;
      },
      callout: ({ value: v }: { value: { tone?: string; body?: string } }) => (
        <div className={cn("rounded-r-brand border-l-4 bg-surface px-4 py-3 text-base", calloutTone[v.tone ?? "info"])}>
          {v.body}
        </div>
      ),
      safetyBadge: ({ value: v }: { value: { level?: string; chain?: string; contractAddress?: string; label?: string } }) => {
        const level = riskLevels.includes(v.level as RiskLevel) ? (v.level as RiskLevel) : "unknown";
        const href =
          v.chain && v.contractAddress
            ? `/safety/scanner?chain=${encodeURIComponent(v.chain)}&address=${encodeURIComponent(v.contractAddress)}`
            : "/safety/scanner";
        return (
          <p>
            <SafetyBadge level={level} href={href} label={v.label} />
          </p>
        );
      },
      chart: ({ value: v }: { value: { title?: string } }) => (
        // Charts are lazy-loaded on market pages only (CLAUDE.md §9); articles show a link instead.
        <figure className="rounded-brand border border-dashed border-border p-4 text-sm text-muted">
          <figcaption>{v.title ?? "Chart"}: interactive chart available on the markets page.</figcaption>
        </figure>
      ),
      embedTweet: ({ value: v }: { value: { url?: string } }) =>
        v.url ? (
          <blockquote>
            <a href={v.url} rel="noopener" target="_blank">
              View post on X
            </a>
          </blockquote>
        ) : null,
    },
    marks: {
      link: ({ value: v, children }: { value?: { href?: string }; children: React.ReactNode }) => {
        const href = v?.href ?? "#";
        if (href.startsWith("/")) return <Link to={href}>{children}</Link>;
        return (
          <a href={href} target="_blank" rel={sponsored ? "sponsored nofollow noopener" : "noopener"}>
            {children}
          </a>
        );
      },
    },
  };

  return (
    <div className="prose-article" data-testid="article-body">
      <PortableText value={value as never} components={components} />
    </div>
  );
}
