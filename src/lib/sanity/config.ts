export const sanityConfig = {
  projectId: (import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined) ?? "",
  dataset: (import.meta.env.VITE_SANITY_DATASET as string | undefined) || "production",
  apiVersion: "2025-01-01",
};

export const isSanityConfigured = () => Boolean(sanityConfig.projectId);
