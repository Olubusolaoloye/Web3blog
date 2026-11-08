import { defineArrayMember, defineField, defineType } from "sanity";
import { articleFields, articleGroups } from "./articleFields";

export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  groups: articleGroups,
  fields: [
    ...articleFields(),
    defineField({
      name: "related",
      title: "Related stories",
      description: "Editorial articles only. Sponsored posts can't be picked here.",
      type: "array",
      group: "taxonomy",
      // to: article only — sponsoredPost can never be referenced from editorial lists (CLAUDE.md §5).
      of: [defineArrayMember({ type: "reference", to: [{ type: "article" }] })],
      validation: (r) => r.max(6),
    }),
  ],
  orderings: [{ title: "Published, newest", name: "publishedDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", type: "type", media: "heroImage", date: "publishedAt" },
    prepare: ({ title, type, media, date }) => ({
      title,
      subtitle: [type, date?.slice(0, 10)].filter(Boolean).join(" · "),
      media,
    }),
  },
});
