import { defineArrayMember, defineField, defineType } from "sanity";

/** Custom Portable Text blocks (CLAUDE.md §5): priceChip, callout, embedTweet, chart, safetyBadge. */
export const priceChip = defineType({
  name: "priceChip",
  title: "Price chip",
  type: "object",
  fields: [defineField({ name: "coinId", title: "CoinGecko id", type: "string", validation: (r) => r.required() })],
  preview: { select: { title: "coinId" }, prepare: ({ title }) => ({ title: `Price: ${title}` }) },
});

export const callout = defineType({
  name: "callout",
  title: "Callout",
  type: "object",
  fields: [
    defineField({
      name: "tone",
      type: "string",
      options: { list: ["info", "warning", "danger"], layout: "radio" },
      initialValue: "info",
    }),
    defineField({ name: "body", type: "text", rows: 3, validation: (r) => r.required() }),
  ],
  preview: { select: { title: "body", subtitle: "tone" } },
});

export const embedTweet = defineType({
  name: "embedTweet",
  title: "Embedded post (X)",
  type: "object",
  fields: [
    defineField({
      name: "url",
      type: "url",
      validation: (r) => r.required().uri({ scheme: ["https"] }),
    }),
  ],
  preview: { select: { title: "url" } },
});

export const chart = defineType({
  name: "chart",
  title: "Chart",
  type: "object",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "coinId", title: "CoinGecko id", type: "string" }),
    defineField({ name: "range", type: "string", options: { list: ["1D", "7D", "1M", "1Y"] }, initialValue: "1M" }),
  ],
  preview: { select: { title: "title", subtitle: "coinId" } },
});

export const chains = [
  { title: "Ethereum", value: "ethereum" },
  { title: "BNB Smart Chain", value: "bsc" },
  { title: "Base", value: "base" },
  { title: "Arbitrum", value: "arbitrum" },
  { title: "Polygon", value: "polygon" },
  { title: "Solana", value: "solana" },
];

export const safetyBadge = defineType({
  name: "safetyBadge",
  title: "Safety badge",
  type: "object",
  fields: [
    defineField({ name: "chain", type: "string", options: { list: chains } }),
    defineField({ name: "contractAddress", type: "string" }),
    defineField({
      name: "level",
      type: "string",
      options: { list: ["low", "medium", "high", "unknown"], layout: "radio" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "label", type: "string" }),
  ],
  preview: { select: { title: "label", subtitle: "level" } },
});

export const blockContent = defineType({
  name: "blockContent",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      marks: {
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [{ name: "href", type: "url", validation: (r) => r.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }) }],
          },
        ],
      },
    }),
    defineArrayMember({ type: "image", fields: [{ name: "alt", type: "string", validation: (r) => r.required() }] }),
    defineArrayMember({ type: "priceChip" }),
    defineArrayMember({ type: "callout" }),
    defineArrayMember({ type: "embedTweet" }),
    defineArrayMember({ type: "chart" }),
    defineArrayMember({ type: "safetyBadge" }),
  ],
});

/** Simple rich text (no custom blocks) for country regulation/tax copy and bios. */
export const richText = defineType({
  name: "richText",
  title: "Rich text",
  type: "array",
  of: [defineArrayMember({ type: "block" })],
});
