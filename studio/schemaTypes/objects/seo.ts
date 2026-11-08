import { defineField, defineType } from "sanity";

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.max(70).warning("Keep titles under 70 characters.") }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      validation: (r) => r.max(160).warning("Keep descriptions under 160 characters."),
    }),
    defineField({ name: "ogImage", title: "Social image override", type: "image" }),
  ],
});
