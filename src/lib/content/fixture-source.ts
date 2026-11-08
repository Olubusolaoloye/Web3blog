import {
  seedArticles,
  seedAuthors,
  seedCategories,
  seedCorrections,
  seedSponsoredPosts,
  seedTags,
  type SeedImage,
} from "./fixtures/seed";
import type {
  Article,
  ArticleSummary,
  AuthorProfile,
  ContentSource,
  ImageData,
  ListArticlesOptions,
  SponsoredPost,
  SponsoredSummary,
  Taxon,
} from "./types";

type SeedArticle = (typeof seedArticles)[number];
type SeedSponsored = (typeof seedSponsoredPosts)[number];
type SeedAuthor = (typeof seedAuthors)[number];

const authorsById = new Map<string, SeedAuthor>(seedAuthors.map((a) => [a._id, a]));
const taxaById = new Map<string, { title: string; slug: { current: string } }>(
  [...seedCategories, ...seedTags].map((t) => [t._id, t]),
);

function image(img: SeedImage): ImageData {
  return { url: img._placeholder, alt: img.alt, width: img.width, height: img.height };
}

function profile(a: SeedAuthor): AuthorProfile {
  return {
    name: a.name,
    slug: a.slug.current,
    role: a.role,
    bio: a.bio,
    expertise: a.expertise,
    holdingsDisclosure: a.holdingsDisclosure,
    photo: image(a.photo),
    socials: a.socials,
  };
}

function author(id: string): AuthorProfile | undefined {
  const a = authorsById.get(id);
  return a ? profile(a) : undefined;
}

function taxon(id: string): Taxon | undefined {
  const t = taxaById.get(id);
  return t ? { title: t.title, slug: t.slug.current } : undefined;
}

const authorNames = (refs: { _ref: string }[]) =>
  refs.map((r) => authorsById.get(r._ref)?.name).filter((n): n is string => Boolean(n));

function summary(a: SeedArticle): ArticleSummary {
  return {
    id: a._id,
    docType: "article",
    slug: a.slug.current,
    title: a.title,
    type: a.type,
    bottomLine: a.bottomLine,
    heroImage: image(a.heroImage),
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    isBreaking: a.isBreaking,
    category: taxon(a.category._ref),
    authorNames: authorNames(a.authors),
  };
}

function body(a: SeedArticle | SeedSponsored) {
  return {
    body: a.body,
    sources: a.sources.map(({ label, url }) => ({ label, url })),
    authors: a.authors.map((r) => author(r._ref)).filter((x): x is AuthorProfile => Boolean(x)),
    editor: a.editor ? author(a.editor._ref) : undefined,
    countries: a.countries.map((r) => r._ref.replace(/^country\./, "")),
    coins: a.coins,
    tags: a.tags.map((r) => taxon(r._ref)).filter((x): x is Taxon => Boolean(x)),
    seo: a.seo,
    faq: a.faq?.map(({ question, answer }) => ({ question, answer })),
  };
}

function full(a: SeedArticle): Article {
  return { ...summary(a), ...body(a) };
}

function sponsoredSummary(p: SeedSponsored): SponsoredSummary {
  return {
    id: p._id,
    docType: "sponsoredPost",
    slug: p.slug.current,
    title: p.title,
    bottomLine: p.bottomLine,
    heroImage: image(p.heroImage),
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    kind: p.kind,
    sponsorName: p.sponsorName,
    noindex: p.noindex,
  };
}

const byDateDesc = <T extends { publishedAt: string }>(a: T, b: T) => b.publishedAt.localeCompare(a.publishedAt);
const sortedArticles = [...seedArticles].sort(byDateDesc);

function matches(a: SeedArticle, o: ListArticlesOptions): boolean {
  if (o.type && a.type !== o.type) return false;
  if (o.category && taxon(a.category._ref)?.slug !== o.category) return false;
  if (o.author && !a.authors.some((r) => authorsById.get(r._ref)?.slug.current === o.author)) return false;
  if (o.country && !a.countries.some((r) => r._ref === `country.${o.country}`)) return false;
  if (o.since && a.publishedAt < o.since) return false;
  if (o.excludeSlug && a.slug.current === o.excludeSlug) return false;
  if (o.query) {
    const q = o.query.toLowerCase();
    if (!`${a.title} ${a.bottomLine.join(" ")}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

export const fixtureSource: ContentSource = {
  name: "fixtures",

  async getArticle(slug) {
    const a = seedArticles.find((x) => x.slug.current === slug);
    return a ? full(a) : null;
  },

  async listArticles(options = {}) {
    const { limit = 20, offset = 0 } = options;
    const filtered = sortedArticles.filter((a) => matches(a, options));
    return { items: filtered.slice(offset, offset + limit).map(summary), total: filtered.length };
  },

  async getRelatedArticles(article, limit = 3) {
    const tagSlugs = new Set(article.tags.map((t) => t.slug));
    const scored = sortedArticles
      .filter((a) => a.slug.current !== article.slug)
      .map((a) => {
        const s = full(a);
        const score =
          s.tags.filter((t) => tagSlugs.has(t.slug)).length * 2 +
          (s.category?.slug === article.category?.slug ? 1 : 0) +
          s.countries.filter((c) => article.countries.includes(c)).length;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || byDateDesc(x.a, y.a));
    const picked = scored.slice(0, limit).map((x) => x.a);
    // Top up with the latest stories so the module is never half-empty.
    for (const a of sortedArticles) {
      if (picked.length >= limit) break;
      if (a.slug.current !== article.slug && !picked.includes(a)) picked.push(a);
    }
    return picked.map(summary);
  },

  async listCategories() {
    return seedCategories.map((c) => ({ title: c.title, slug: c.slug.current }));
  },

  async getAuthor(slug) {
    const a = seedAuthors.find((x) => x.slug.current === slug);
    return a ? profile(a) : null;
  },

  async listAuthors() {
    return seedAuthors.map(profile);
  },

  async getSponsoredPost(slug) {
    const p = seedSponsoredPosts.find((x) => x.slug.current === slug);
    if (!p) return null;
    const post: SponsoredPost = {
      ...sponsoredSummary(p),
      type: p.type,
      category: taxon(p.category._ref),
      authorNames: authorNames(p.authors),
      disclosureText: p.disclosureText,
      ...body(p),
    };
    return post;
  },

  async listSponsoredPosts({ limit = 20, includeNoindex = true } = {}) {
    return [...seedSponsoredPosts]
      .sort(byDateDesc)
      .filter((p) => includeNoindex || !p.noindex)
      .slice(0, limit)
      .map(sponsoredSummary);
  },

  async listCorrections() {
    return seedCorrections
      .map((c) => {
        const a = seedArticles.find((x) => x._id === c.article._ref);
        return a ? { id: c._id, date: c.date, note: c.note, article: { slug: a.slug.current, title: a.title } } : undefined;
      })
      .filter((c) => c !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
};
