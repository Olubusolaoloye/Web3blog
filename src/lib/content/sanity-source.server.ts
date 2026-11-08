import { getSanityClient } from "~/lib/sanity/client.server";
import { decorateImages } from "~/lib/sanity/image.server";
import {
  articleBySlugQuery,
  articleListQuery,
  authorBySlugQuery,
  authorsQuery,
  autoRelatedQuery,
  categoriesQuery,
  correctionsQuery,
  packagesQuery,
  partnerSettingsQuery,
  countryByCodeQuery,
  pickedRelatedQuery,
  sponsoredBySlugQuery,
  sponsoredListQuery,
} from "~/lib/sanity/queries";
import type {
  Article,
  ArticleSummary,
  AuthorProfile,
  ContentSource,
  Correction,
  CountryDoc,
  Paged,
  PartnerPackage,
  PartnerSettings,
  SponsoredPost,
  SponsoredSummary,
  Taxon,
} from "./types";

// Every result passes through decorateImages so image URLs and srcsets are built here, on the server.
const fetch = async <T>(query: string, params: Record<string, unknown> = {}) =>
  decorateImages(await getSanityClient().fetch<T>(query, params));
const lowerCountries = <T extends { countries: string[] }>(doc: T): T => ({
  ...doc,
  countries: doc.countries.map((c) => c.toLowerCase()),
});

export const sanitySource: ContentSource = {
  name: "sanity",

  async getArticle(slug) {
    const article = await fetch<Article | null>(articleBySlugQuery, { slug });
    return article ? lowerCountries(article) : null;
  },

  async listArticles(o = {}) {
    const limit = o.limit ?? 20;
    const offset = o.offset ?? 0;
    return fetch<Paged<ArticleSummary>>(articleListQuery, {
      type: o.type ?? null,
      coin: o.coin ?? null,
      category: o.category ?? null,
      author: o.author ?? null,
      country: o.country ?? null,
      since: o.since ?? null,
      exclude: o.excludeSlug ?? null,
      q: o.query ? `${o.query}*` : null,
      offset,
      end: offset + limit,
    });
  },

  async getRelatedArticles(article, limit = 3) {
    const picked = (await fetch<ArticleSummary[] | null>(pickedRelatedQuery, { slug: article.slug })) ?? [];
    if (picked.length >= limit) return picked.slice(0, limit);
    const auto = await fetch<ArticleSummary[]>(autoRelatedQuery, {
      slug: article.slug,
      category: article.category?.slug ?? null,
      tags: article.tags.map((t) => t.slug),
      countries: article.countries.map((c) => c.toUpperCase()),
      limit: limit + picked.length,
    });
    const seen = new Set(picked.map((p) => p.slug));
    const combined = [...picked, ...auto.filter((a) => !seen.has(a.slug))];
    if (combined.length < limit) {
      // Top up with the latest stories so the module is never half-empty.
      const latest = await sanitySource.listArticles({ limit: limit + combined.length + 1, excludeSlug: article.slug });
      const have = new Set(combined.map((a) => a.slug));
      combined.push(...latest.items.filter((a) => !have.has(a.slug)));
    }
    return combined.slice(0, limit);
  },

  listCategories: () => fetch<Taxon[]>(categoriesQuery),
  getAuthor: (slug) => fetch<AuthorProfile | null>(authorBySlugQuery, { slug }),
  listAuthors: () => fetch<AuthorProfile[]>(authorsQuery),

  async getSponsoredPost(slug) {
    const post = await fetch<SponsoredPost | null>(sponsoredBySlugQuery, { slug });
    return post ? lowerCountries(post) : null;
  },

  listSponsoredPosts: ({ limit = 20, includeNoindex = true } = {}) =>
    fetch<SponsoredSummary[]>(sponsoredListQuery, { limit, includeNoindex }),

  listCorrections: () => fetch<Correction[]>(correctionsQuery),
  getCountry: (code) => fetch<CountryDoc | null>(countryByCodeQuery, { code }),
  listPackages: () => fetch<PartnerPackage[]>(packagesQuery),
  async getPartnerSettings() {
    const s = await fetch<PartnerSettings | null>(partnerSettingsQuery);
    return s ?? { headline: "Partner with us", audienceStats: [], countries: [], formats: [], mediaKitUrl: "/media-kit.pdf" };
  },
};
