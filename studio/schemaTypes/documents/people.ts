import { defineArrayMember, defineField, defineType } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "name" }, validation: (r) => r.required() }),
    defineField({
      name: "photo",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string", validation: (r) => r.required() })],
    }),
    defineField({ name: "role", type: "string", validation: (r) => r.required() }),
    defineField({ name: "bio", type: "text", rows: 4 }),
    defineField({ name: "expertise", type: "array", of: [defineArrayMember({ type: "string" })], options: { layout: "tags" } }),
    defineField({
      name: "holdingsDisclosure",
      type: "text",
      rows: 3,
      description: "Which crypto assets this person holds. Shown on their profile.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "socials",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "url" }),
        defineField({ name: "linkedin", title: "LinkedIn", type: "url" }),
        defineField({ name: "telegram", type: "url" }),
      ],
    }),
  ],
  preview: { select: { title: "name", subtitle: "role", media: "photo" } },
});
