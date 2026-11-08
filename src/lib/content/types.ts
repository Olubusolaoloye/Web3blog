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
  slug: string;
  title: string;
  type: ArticleType;
  bottomLine: string[];
  heroImage: ImageData;
  publishedAt: string;
  updatedAt?: string;
  isBreaking: boolean;
  category?: Taxon;
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

export interface ListArticlesOptions {
  limit?: number;
  type?: ArticleType;
}

/**
 * Everything the app reads from the CMS goes through this interface.
 * Implementations: Sanity (GROQ) and local fixtures (no credentials needed).
 * Editorial lists only ever return `article` documents, never `sponsoredPost` (CLAUDE.md §7.11).
 */
export interface ContentSource {
  readonly name: "sanity" | "fixtures";
  getArticle(slug: string): Promise<Article | null>;
  listArticles(options?: ListArticlesOptions): Promise<ArticleSummary[]>;
}
