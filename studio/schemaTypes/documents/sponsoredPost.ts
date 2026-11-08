import { defineField, defineType } from "sanity";
import { articleFields, articleGroups } from "./articleFields";

/** Rendered only under /press (CLAUDE.md §7.11). Outbound links are always rel="sponsored nofollow". */
export const sponsoredPost = defineType({
  name: "sponsoredPost",
  title: "Sponsored / Press release",
  type: "document",
  groups: [{ name: "sponsor", title: "Sponsor" }, ...articleGroups],
  fields: [
    defineField({
      name: "kind",
      type: "string",
      group: "sponsor",
      options: { list: [{ title: "Sponsored", value: "sponsored" }, { title: "Press release", value: "pressRelease" }], layout: "radio" },
      initialValue: "sponsored",
      validation: (r) => r.required(),
    }),
    defineField({ name: "sponsorName", type: "string", group: "sponsor", validation: (r) => r.required() }),
    defineField({ name: "disclosureText", type: "text", rows: 2, group: "sponsor", validation: (r) => r.required() }),
    defineField({ name: "noindex", type: "boolean", group: "sponsor", initialValue: false }),
    defineField({
      name: "linksRel",
      type: "string",
      group: "sponsor",
      initialValue: "sponsored nofollow",
      readOnly: true,
      description: "Fixed. Every outbound link in sponsored content uses rel=\"sponsored nofollow\".",
      validation: (r) => r.custom((v) => (v === undefined || v === "sponsored nofollow" ? true : "Must be \"sponsored nofollow\"")),
    }),
    ...articleFields(),
  ],
  preview: {
    select: { title: "title", sponsor: "sponsorName", kind: "kind", media: "heroImage" },
    prepare: ({ title, sponsor, kind, media }) => ({
      title,
      subtitle: `${kind === "pressRelease" ? "Press release" : "Sponsored"} · ${sponsor ?? ""}`,
      media,
    }),
  },
});
