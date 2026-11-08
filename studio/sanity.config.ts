import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes, SINGLETON_TYPES } from "./schemaTypes";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || "your-project-id";
const dataset = process.env.SANITY_STUDIO_DATASET || "production";

export default defineConfig({
  name: "default",
  title: "Newsroom Studio",
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Site settings")
              .id("siteSettings")
              .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
            S.divider(),
            S.documentTypeListItem("article").title("Articles"),
            S.documentTypeListItem("sponsoredPost").title("Sponsored & press (only /press)"),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !SINGLETON_TYPES.has(item.getId() ?? "") && !["article", "sponsoredPost"].includes(item.getId() ?? ""),
            ),
          ]),
    }),
    visionTool({ defaultApiVersion: "2025-01-01" }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETON_TYPES.has(schemaType)),
  },
  document: {
    actions: (input, ctx) =>
      SINGLETON_TYPES.has(ctx.schemaType)
        ? input.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action))
        : input,
  },
});
