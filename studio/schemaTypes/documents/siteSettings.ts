import { defineArrayMember, defineField, defineType } from "sanity";

const link = defineArrayMember({
  type: "object",
  name: "navLink",
  fields: [
    defineField({ name: "label", type: "string", validation: (r) => r.required() }),
    defineField({ name: "href", type: "string", validation: (r) => r.required() }),
  ],
});

/** Singleton (fixed document id "siteSettings"). */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "nav", type: "array", of: [link] }),
    defineField({
      name: "footer",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "footerGroup",
          fields: [defineField({ name: "heading", type: "string" }), defineField({ name: "links", type: "array", of: [link] })],
        }),
      ],
    }),
    defineField({
      name: "homepageModules",
      title: "Homepage modules",
      type: "object",
      fields: [
        // Editorial picks reference `article` only, never `sponsoredPost` (CLAUDE.md §5).
        defineField({ name: "pinnedStories", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "article" }] })], validation: (r) => r.max(6) }),
        defineField({ name: "researchHighlight", type: "reference", to: [{ type: "researchReport" }] }),
      ],
    }),
    defineField({
      name: "announcementBar",
      type: "object",
      fields: [
        defineField({ name: "enabled", type: "boolean", initialValue: false }),
        defineField({ name: "text", type: "string" }),
        defineField({ name: "href", type: "string" }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
