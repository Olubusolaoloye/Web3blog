import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

/**
 * Shared client chunk (decision 17). Many tiny chunks compress worse than one, which mattered for the article JS
 * budget (CLAUDE.md §9). Keep this list to code that (nearly) every page renders.
 */
const SHARED = [
  "config/",
  "lib/utils",
  "lib/theme",
  "lib/dates",
  "lib/seo/meta",
  "lib/sanity/",
  "lib/market/live",
  "lib/market/format",
  "lib/market/sparkline",
  "lib/capture/source",
  "components/layout/Header",
  "components/layout/Footer",
  "components/layout/Ticker",
  "components/layout/Logo",
  "components/layout/CountrySwitcher",
  "components/layout/ThemeToggle",
  "components/layout/Breadcrumbs",
  "components/layout/NotFound",
  "components/media/",
  "components/capture/NewsletterBox",
  "components/market/PriceChip",
  "components/market/Sparkline",
  "components/article/ArticleCard",
];

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: { "~": srcDir },
  },
  build: isSsrBuild
    ? {}
    : {
        rollupOptions: {
          output: {
            // Shared app code (components, lib, config) ships as one chunk instead of ~15 tiny ones.
            // Each file is compressed separately, so merging saves bytes on the article JS budget (CLAUDE.md §9).
            manualChunks(id) {
              if (!id.startsWith(srcDir)) return undefined;
              // JSON-LD builders are only needed by pages that build it in `meta`; keep them off the article path.
              if (id.startsWith(`${srcDir}/lib/seo/jsonld`) || id.startsWith(`${srcDir}/lib/seo/static-meta`)) return "jsonld";
              // Code every page needs (layout, config, shared lib, chips, capture, cards) ships as one chunk;
              // everything else (page-specific UI, the lazy chart) is left to Rollup's per-route splitting.
              if (SHARED.some((p) => id.startsWith(`${srcDir}/${p}`))) return "app";
              return undefined;
            },
          },
        },
      },
}));
