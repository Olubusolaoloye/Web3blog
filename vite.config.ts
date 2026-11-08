import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

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
              // JSON-LD builders are only needed by pages that build it in `meta`; keep them off the article path.
              if (id.startsWith(`${srcDir}/lib/seo/jsonld`) || id.startsWith(`${srcDir}/lib/seo/static-meta`)) return "jsonld";
              if (id.startsWith(`${srcDir}/components/`) || id.startsWith(`${srcDir}/lib/`) || id.startsWith(`${srcDir}/config/`)) {
                return "app";
              }
              return undefined;
            },
          },
        },
      },
}));
