import { defineArrayMember, defineField, type FieldDefinition } from "sanity";
import { bottomLineError, heroImageError, sourcesError } from "../rules";

export const ARTICLE_TYPES = [
  { title: "News", value: "news" },
  { title: "Analysis", value: "analysis" },
  { title: "Local", value: "local" },
  { title: "Safety", value: "safety" },
  { title: "Learn", value: "learn" },
  { title: "Research", value: "research" },
];

/** Fields shared by `article` and `sponsoredPost` (CLAUDE.md §5). */
export function articleFields(): FieldDefinition[] {
  return [
    defineField({ name: "title", type: "string", group: "content", validation: (r) => r.required().max(120) }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "type",
      type: "string",
      group: "content",
      options: { list: ARTICLE_TYPES, layout: "radio", direction: "horizontal" },
      initialValue: "news",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "bottomLine",
      title: "The Bottom Line",
      description: "1–3 short bullets shown at the top of the article. Required.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "string", validation: (r) => r.max(200) })],
      validation: (r) => r.custom((value: string[] | undefined) => bottomLineError(value)),
    }),
    defineField({
      name: "heroImage",
      type: "image",
      group: "content",
      options: { hotspot: true },
      description: "At least 1200px wide. Alt text is required.",
      fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (r) => r.required() })],
      validation: (r) => r.custom((value) => heroImageError(value as Parameters<typeof heroImageError>[0])),
    }),
    defineField({ name: "body", type: "blockContent", group: "content", validation: (r) => r.required() }),
    defineField({
      name: "sources",
      type: "array",
      group: "content",
      description: "At least one source is required for news.",
      of: [defineArrayMember({ type: "source" })],
      validation: (r) =>
        r.custom((value: unknown[] | undefined, ctx) => sourcesError((ctx.document as { type?: string } | undefined)?.type, value)),
    }),
    defineField({
      name: "authors",
      type: "array",
      group: "people",
      of: [defineArrayMember({ type: "reference", to: [{ type: "author" }] })],
      validation: (r) => r.required().min(1),
    }),
    defineField({ name: "editor", type: "reference", group: "people", to: [{ type: "author" }] }),
    defineField({
      name: "countries",
      type: "array",
      group: "taxonomy",
      of: [defineArrayMember({ type: "reference", to: [{ type: "country" }] })],
    }),
    defineField({
      name: "coins",
      title: "Coins (CoinGecko ids)",
      type: "array",
      group: "taxonomy",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({ name: "category", type: "reference", group: "taxonomy", to: [{ type: "category" }], validation: (r) => r.required() }),
    defineField({
      name: "tags",
      type: "array",
      group: "taxonomy",
      of: [defineArrayMember({ type: "reference", to: [{ type: "tag" }] })],
    }),
    defineField({ name: "publishedAt", type: "datetime", group: "publishing", validation: (r) => r.required() }),
    defineField({ name: "updatedAt", type: "datetime", group: "publishing" }),
    defineField({ name: "isBreaking", type: "boolean", group: "publishing", initialValue: false }),
    defineField({ name: "seo", type: "seo", group: "seo" }),
    defineField({ name: "faq", title: "FAQ (for FAQPage schema)", type: "array", group: "seo", of: [defineArrayMember({ type: "faqItem" })] }),
  ];
}

export const articleGroups = [
  { name: "content", title: "Content", default: true },
  { name: "people", title: "People" },
  { name: "taxonomy", title: "Taxonomy" },
  { name: "publishing", title: "Publishing" },
  { name: "seo", title: "SEO" },
];
