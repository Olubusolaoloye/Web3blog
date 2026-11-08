import { defineArrayMember, defineField, defineType } from "sanity";

/** Package codes from CLAUDE.md §7.12. The booking form only accepts these. */
export const PACKAGE_CODES = [
  "pr-basic",
  "sponsored-article",
  "newsletter-top-slot",
  "launch-in-nigeria",
  "launch-in-kenya",
  "directory-verified",
  "directory-featured",
  "sponsored-research",
] as const;

export const partnerPackage = defineType({
  name: "package",
  title: "Partner package",
  type: "document",
  fields: [
    defineField({
      name: "code",
      type: "string",
      options: { list: PACKAGE_CODES.map((c) => ({ title: c, value: c })) },
      validation: (r) => r.required(),
    }),
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "priceUsd", title: "Price (USD)", type: "number", validation: (r) => r.required().min(0) }),
    defineField({ name: "priceNote", type: "string", description: 'e.g. "per month" or "from"' }),
    defineField({ name: "summary", type: "text", rows: 2, validation: (r) => r.required() }),
    defineField({ name: "deliverables", type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "order", type: "number", initialValue: 100 }),
    defineField({ name: "active", type: "boolean", initialValue: true }),
  ],
  orderings: [{ title: "Display order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", code: "code", price: "priceUsd" },
    prepare: ({ title, code, price }) => ({ title, subtitle: `${code} · $${price}` }),
  },
});

/** Singleton (document id "partnerSettings"): admin-editable audience stats and media kit. */
export const partnerSettings = defineType({
  name: "partnerSettings",
  title: "Partners hub settings",
  type: "document",
  fields: [
    defineField({ name: "headline", type: "string", validation: (r) => r.required() }),
    defineField({ name: "intro", type: "text", rows: 3 }),
    defineField({
      name: "audienceStats",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "stat",
          fields: [
            defineField({ name: "label", type: "string", validation: (r) => r.required() }),
            defineField({ name: "value", type: "string", validation: (r) => r.required() }),
            defineField({ name: "note", type: "string" }),
          ],
        }),
      ],
    }),
    defineField({ name: "statsUpdatedAt", type: "date" }),
    defineField({
      name: "countries",
      description: "Launch markets, ISO-2 lower-case",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "formats",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "format",
          fields: [defineField({ name: "name", type: "string" }), defineField({ name: "description", type: "text", rows: 2 })],
        }),
      ],
    }),
    defineField({ name: "mediaKit", title: "Media kit PDF", type: "file", options: { accept: "application/pdf" } }),
  ],
  preview: { prepare: () => ({ title: "Partners hub settings" }) },
});
