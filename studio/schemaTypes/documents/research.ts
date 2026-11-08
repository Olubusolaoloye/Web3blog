import { defineArrayMember, defineField, defineType } from "sanity";

export const researchReport = defineType({
  name: "researchReport",
  title: "Research report",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (r) => r.required() }),
    defineField({ name: "summary", type: "text", rows: 4, validation: (r) => r.required() }),
    defineField({ name: "pdf", type: "file", options: { accept: "application/pdf" } }),
    defineField({ name: "gated", type: "boolean", initialValue: false, description: "Require an email before the PDF download." }),
    defineField({ name: "charts", type: "array", of: [defineArrayMember({ type: "chart" }), defineArrayMember({ type: "image" })] }),
    defineField({ name: "methodology", type: "richText" }),
    defineField({ name: "authors", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "author" }] })] }),
    defineField({ name: "publishedAt", type: "datetime" }),
  ],
});

export const correction = defineType({
  name: "correction",
  title: "Correction",
  type: "document",
  fields: [
    // Corrections point at editorial articles only.
    defineField({ name: "article", type: "reference", to: [{ type: "article" }], validation: (r) => r.required() }),
    defineField({ name: "date", type: "date", validation: (r) => r.required() }),
    defineField({ name: "note", type: "text", rows: 3, validation: (r) => r.required() }),
  ],
  preview: { select: { title: "article.title", subtitle: "date" } },
});
