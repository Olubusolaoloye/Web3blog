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

export interface ListArticlesOptions {
  limit?: number;
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
}
