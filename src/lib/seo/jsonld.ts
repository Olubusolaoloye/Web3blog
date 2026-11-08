/**
 * JSON-LD builders (CLAUDE.md §9). Output is emitted through React Router `meta` as `script:ld+json`
 * (serialised + HTML-escaped by React Router), so it is in the server HTML before any JS runs.
 *
 * Sponsored content must never be described as NewsArticle; `articleJsonLd` refuses non-editorial docs.
 */
import { site } from "~/config/site";
import type { Article, AuthorProfile, AuthorSummary, FaqItem, ImageData, SponsoredPost } from "~/lib/content/types";
import { sanityImageUrl } from "~/lib/sanity/image";
import { absoluteUrl } from "./meta";

export type JsonLd = Record<string, unknown> & { "@type": string | string[] };

const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

export function imageUrl(image: ImageData, width = 1200): string {
  return absoluteUrl((image.assetRef && sanityImageUrl(image.assetRef, width)) || image.url);
}

export function authorUrl(slug: string): string {
  return absoluteUrl(`/authors/${slug}`);
}

export function organizationJsonLd(): JsonLd {
  return {
    "@type": "NewsMediaOrganization",
    "@id": ORG_ID,
    name: site.name,
    url: site.url,
    slogan: site.tagline,
    logo: { "@type": "ImageObject", url: absoluteUrl(site.logoPath), width: 512, height: 512 },
    sameAs: Object.values(site.socials),
    publishingPrinciples: absoluteUrl("/standards"),
    correctionsPolicy: absoluteUrl("/corrections"),
    ethicsPolicy: absoluteUrl("/standards#ethics"),
    email: site.contactEmail,
  };
}

/** Compact reference to the publisher (full object, so validators that don't follow @id still see name + logo). */
function publisher(): JsonLd {
  const org = organizationJsonLd();
  return { "@type": org["@type"], "@id": ORG_ID, name: org.name, url: org.url, logo: org.logo };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: site.url,
    inLanguage: site.locale,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/news?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

function personRef(a: AuthorSummary): JsonLd {
  return { "@type": "Person", name: a.name, url: authorUrl(a.slug), jobTitle: a.role };
}

function articleCore(doc: Article | SponsoredPost, path: string) {
  return {
    headline: doc.title.length > 110 ? `${doc.title.slice(0, 107)}...` : doc.title,
    description: doc.seo?.description ?? doc.bottomLine[0],
    image: [imageUrl(doc.heroImage, 1200)],
    datePublished: doc.publishedAt,
    dateModified: doc.updatedAt ?? doc.publishedAt,
    author: doc.authors.map(personRef),
    publisher: publisher(),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
    url: absoluteUrl(path),
    inLanguage: site.locale,
    ...(doc.category ? { articleSection: doc.category.title } : {}),
    ...(doc.tags.length ? { keywords: doc.tags.map((t) => t.title).join(", ") } : {}),
    isAccessibleForFree: true,
  };
}

/** NewsArticle for editorial articles only. */
export function newsArticleJsonLd(article: Article): JsonLd {
  if (article.docType !== "article") throw new Error("NewsArticle JSON-LD is only for editorial articles");
  return { "@type": "NewsArticle", ...articleCore(article, `/news/${article.slug}`) };
}

/** Plain Article (never NewsArticle) for sponsored posts and press releases (CLAUDE.md §7.11). */
export function sponsoredArticleJsonLd(post: SponsoredPost): JsonLd {
  return {
    "@type": "Article",
    ...articleCore(post, `/press/${post.slug}`),
    sponsor: { "@type": "Organization", name: post.sponsorName },
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faq: readonly FaqItem[]): JsonLd {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function personJsonLd(author: AuthorProfile): JsonLd {
  return {
    "@type": "Person",
    "@id": `${authorUrl(author.slug)}#person`,
    name: author.name,
    url: authorUrl(author.slug),
    jobTitle: author.role,
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.photo ? { image: imageUrl(author.photo, 400) } : {}),
    ...(author.expertise.length ? { knowsAbout: author.expertise } : {}),
    sameAs: Object.values(author.socials).filter(Boolean),
    worksFor: { "@id": ORG_ID },
  };
}

export interface DatasetInput {
  name: string;
  description: string;
  path: string;
  datePublished?: string;
  creatorNames?: string[];
  downloadUrl?: string;
}

/** For research reports (Phase 7). */
export function datasetJsonLd(d: DatasetInput): JsonLd {
  return {
    "@type": "Dataset",
    name: d.name,
    description: d.description,
    url: absoluteUrl(d.path),
    ...(d.datePublished ? { datePublished: d.datePublished } : {}),
    creator: d.creatorNames?.length
      ? d.creatorNames.map((name) => ({ "@type": "Person", name }))
      : { "@id": ORG_ID, "@type": "Organization", name: site.name },
    publisher: publisher(),
    isAccessibleForFree: true,
    ...(d.downloadUrl
      ? { distribution: { "@type": "DataDownload", encodingFormat: "application/pdf", contentUrl: absoluteUrl(d.downloadUrl) } }
      : {}),
  };
}

/** Wraps entities in one @graph document. */
export function graph(...nodes: JsonLd[]): Record<string, unknown> {
  return { "@context": "https://schema.org", "@graph": nodes };
}
