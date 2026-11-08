import { seedArticles, seedAuthors, seedCategories, seedTags, type SeedImage } from "./fixtures/seed";
import type { Article, ArticleSummary, AuthorSummary, ContentSource, ImageData, ListArticlesOptions, Taxon } from "./types";

type SeedArticle = (typeof seedArticles)[number];

const byId = new Map<string, Record<string, unknown>>(
  [...seedAuthors, ...seedCategories, ...seedTags].map((d) => [d._id, d as unknown as Record<string, unknown>]),
);

function image(img: SeedImage): ImageData {
  return { url: img._placeholder, alt: img.alt, width: img.width, height: img.height };
}

function author(id: string): AuthorSummary | undefined {
  const a = byId.get(id) as (typeof seedAuthors)[number] | undefined;
  if (!a) return undefined;
  return {
    name: a.name,
    slug: a.slug.current,
    role: a.role,
    bio: a.bio,
    expertise: a.expertise,
    holdingsDisclosure: a.holdingsDisclosure,
    photo: image(a.photo),
  };
}

function taxon(id: string): Taxon | undefined {
  const t = byId.get(id) as { title: string; slug: { current: string } } | undefined;
  return t ? { title: t.title, slug: t.slug.current } : undefined;
}

function summary(a: SeedArticle): ArticleSummary {
  return {
    id: a._id,
    slug: a.slug.current,
    title: a.title,
    type: a.type,
    bottomLine: a.bottomLine,
    heroImage: image(a.heroImage),
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    isBreaking: a.isBreaking,
    category: taxon(a.category._ref),
  };
}

function full(a: SeedArticle): Article {
  return {
    ...summary(a),
    body: a.body,
    sources: a.sources.map(({ label, url }) => ({ label, url })),
    authors: a.authors.map((r) => author(r._ref)).filter((x): x is AuthorSummary => Boolean(x)),
    editor: a.editor ? author(a.editor._ref) : undefined,
    countries: a.countries.map((r) => r._ref.replace(/^country\./, "")),
    coins: a.coins,
    tags: a.tags.map((r) => taxon(r._ref)).filter((x): x is Taxon => Boolean(x)),
    seo: a.seo,
    faq: a.faq?.map(({ question, answer }) => ({ question, answer })),
  };
}

const sorted = [...seedArticles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const fixtureSource: ContentSource = {
  name: "fixtures",
  async getArticle(slug) {
    const a = seedArticles.find((x) => x.slug.current === slug);
    return a ? full(a) : null;
  },
  async listArticles({ limit = 20, type }: ListArticlesOptions = {}) {
    return sorted.filter((a) => !type || a.type === type).slice(0, limit).map(summary);
  },
};
