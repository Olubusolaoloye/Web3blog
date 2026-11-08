import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build/**", ".react-router/**", "node_modules/**", "studio/dist/**", "studio/.sanity/**", "studio/node_modules/**", "test-results/**", "playwright-report/**", "src/lib/sanity/sanity.types.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-restricted-imports": [
        "error",
        {
          // CLAUDE.md §13 rule 9: never Next.js.
          patterns: [{ group: ["next", "next/*", "@next/*"], message: "Next.js is not allowed in this project. Use React Router v7." }],
        },
      ],
    },
  },
);
