import type { PortableTextBlock, TypedObject } from "@portabletext/types";

export const articleTypes = ["news", "analysis", "local", "safety", "learn", "research"] as const;
export type ArticleType = (typeof articleTypes)[number];

export interface ImageData {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Sanity asset id (image-<hash>-<w>x<h>-<ext>) when the image lives on the Sanity CDN. */
  assetRef?: string;
  /** Responsive CDN srcset, built on the server (lib/sanity/image.server.ts). */
  srcSet?: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface Taxon {
  title: string;
  slug: string;
}

export interface AuthorSummary {
  name: string;
  slug: string;
  role: string;
  bio?: string;
  expertise: string[];
  holdingsDisclosure?: string;
  photo?: ImageData;
}

export type BodyBlock = PortableTextBlock | (TypedObject & Record<string, unknown>);

export interface ArticleSummary {
  id: string;
  /** Always "article" for editorial content. Used by tests and JSON-LD to keep sponsored content out. */
  docType: "article";
  slug: string;
  title: string;
  type: ArticleType;
  bottomLine: string[];
  heroImage: ImageData;
  publishedAt: string;
  updatedAt?: string;
  isBreaking: boolean;
  category?: Taxon;
  authorNames: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Article extends ArticleSummary {
  body: BodyBlock[];
  sources: Source[];
  authors: AuthorSummary[];
  editor?: AuthorSummary;
  countries: string[];
  coins: string[];
  tags: Taxon[];
  seo?: { title?: string; description?: string };
  faq?: FaqItem[];
}

export interface AuthorProfile extends AuthorSummary {
  socials: { x?: string; linkedin?: string; telegram?: string };
}

export interface SponsoredPost extends Omit<Article, "isBreaking" | "docType"> {
  docType: "sponsoredPost";
  kind: "sponsored" | "pressRelease";
  sponsorName: string;
  disclosureText: string;
  noindex: boolean;
}

export type SponsoredSummary = Pick<
  SponsoredPost,
  "id" | "docType" | "slug" | "title" | "bottomLine" | "heroImage" | "publishedAt" | "updatedAt" | "kind" | "sponsorName" | "noindex"
>;

export interface Correction {
  id: string;
  date: string;
  note: string;
  article: { slug: string; title: string };
}

/** Country document from the CMS (CLAUDE.md §5). Hubs and converter pages render from this + config only. */
export interface CountryDoc {
  /** Lower-case ISO-2 */
  code: string;
  name: string;
  currency: string;
  flag?: string;
  hubIntro?: string;
  regulationStatus: BodyBlock[];
  regulationUpdatedAt?: string;
  taxGuide: BodyBlock[];
  /** Short local "how to buy" context. Converter pages 404 without it (no thin pages, §7.3). */
  howToBuy: BodyBlock[];
  /** Directory entry slugs (Supabase). Only verified/featured entries are shown. */
  recommendedExchanges: string[];
}

export const packageCodes = [
  "pr-basic",
  "sponsored-article",
  "newsletter-top-slot",
  "launch-in-nigeria",
  "launch-in-kenya",
  "directory-verified",
  "directory-featured",
  "sponsored-research",
] as const;
export type PackageCode = (typeof packageCodes)[number];

export interface PartnerPackage {
  code: PackageCode;
  name: string;
  priceUsd: number;
  priceNote?: string;
  summary: string;
  deliverables: string[];
}

export interface PartnerSettings {
  headline: string;
  intro?: string;
  audienceStats: { label: string; value: string; note?: string }[];
  statsUpdatedAt?: string;
  countries: string[];
  formats: { name: string; description?: string }[];
  /** Sanity file URL, or the bundled /media-kit.pdf when none is uploaded. */
  mediaKitUrl: string;
}

export interface ListArticlesOptions {
  limit?: number;
  /** CoinGecko id in the article's `coins` */
  coin?: string;
  offset?: number;
  type?: ArticleType;
  /** Category slug */
  category?: string;
  /** Author slug */
  author?: string;
  /** Country code (lower-case ISO-2) */
  country?: string;
  /** Case-insensitive text search over title and Bottom Line */
  query?: string;
  /** ISO date-time: only articles published at or after this instant */
  since?: string;
  excludeSlug?: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

/**
 * Everything the app reads from the CMS goes through this interface.
 * Implementations: Sanity (GROQ) and local fixtures (no credentials needed).
 *
 * Editorial methods (`listArticles`, `getRelatedArticles`, `getArticle`) only ever return `article` documents,
 * never `sponsoredPost` (CLAUDE.md §7.11, rule 2). Sponsored content has its own methods and is rendered only
 * under /press.
 */
export interface ContentSource {
  readonly name: "sanity" | "fixtures";
  getArticle(slug: string): Promise<Article | null>;
  listArticles(options?: ListArticlesOptions): Promise<Paged<ArticleSummary>>;
  getRelatedArticles(article: Article, limit?: number): Promise<ArticleSummary[]>;
  listCategories(): Promise<Taxon[]>;
  getAuthor(slug: string): Promise<AuthorProfile | null>;
  listAuthors(): Promise<AuthorProfile[]>;
  getSponsoredPost(slug: string): Promise<SponsoredPost | null>;
  listSponsoredPosts(options?: { limit?: number; includeNoindex?: boolean }): Promise<SponsoredSummary[]>;
  listCorrections(): Promise<Correction[]>;
  getCountry(code: string): Promise<CountryDoc | null>;
  /** Active packages in display order. Prices always come from here, never from the browser. */
  listPackages(): Promise<PartnerPackage[]>;
  getPartnerSettings(): Promise<PartnerSettings>;
}
