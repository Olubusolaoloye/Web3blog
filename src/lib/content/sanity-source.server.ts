import { getSanityClient } from "~/lib/sanity/client.server";
import { articleBySlugQuery, articleListQuery } from "~/lib/sanity/queries";
import type { Article, ArticleSummary, ContentSource, ListArticlesOptions } from "./types";

export const sanitySource: ContentSource = {
  name: "sanity",
  async getArticle(slug) {
    const article = await getSanityClient().fetch<Article | null>(articleBySlugQuery, { slug });
    if (!article) return null;
    return { ...article, countries: article.countries.map((c) => c.toLowerCase()) };
  },
  async listArticles({ limit = 20, type }: ListArticlesOptions = {}) {
    return getSanityClient().fetch<ArticleSummary[]>(articleListQuery, { limit, type: type ?? null });
  },
};
