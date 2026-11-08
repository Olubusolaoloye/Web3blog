import { defineField, defineType } from "sanity";

export const source = defineType({
  name: "source",
  title: "Source",
  type: "object",
  fields: [
    defineField({ name: "label", type: "string", validation: (r) => r.required() }),
    defineField({ name: "url", type: "url", validation: (r) => r.required().uri({ scheme: ["http", "https"] }) }),
  ],
  preview: { select: { title: "label", subtitle: "url" } },
});
