import { defineArrayMember, defineField, defineType } from "sanity";

export const country = defineType({
  name: "country",
  title: "Country",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "code",
      title: "ISO-3166 alpha-2 code",
      type: "string",
      validation: (r) => r.required().regex(/^[A-Z]{2}$/, { name: "ISO-2 uppercase" }),
    }),
    defineField({
      name: "currency",
      title: "ISO-4217 currency",
      type: "string",
      validation: (r) => r.required().regex(/^[A-Z]{3}$/, { name: "ISO-4217" }),
    }),
    defineField({ name: "flag", type: "string", description: "Flag emoji" }),
    defineField({ name: "hubIntro", type: "text", rows: 3 }),
    defineField({ name: "regulationStatus", type: "richText" }),
    defineField({ name: "regulationUpdatedAt", title: "Regulation last reviewed", type: "date" }),
    defineField({ name: "taxGuide", type: "richText" }),
    defineField({
      name: "recommendedExchanges",
      description: "Directory entry slugs (directory entries live in Supabase). Only verified entries are shown.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
  ],
  preview: {
    select: { title: "name", code: "code", flag: "flag" },
    prepare: ({ title, code, flag }) => ({ title: `${flag ?? ""} ${title}`, subtitle: code }),
  },
});
