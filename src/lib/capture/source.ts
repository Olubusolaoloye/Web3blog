/** Capture-source helpers. Kept free of Zod so client components can import them without the validator. */
export const captureVariants = ["inline", "sticky-footer", "end-of-article", "homepage", "page"] as const;
export type CaptureVariant = (typeof captureVariants)[number];

export function captureSource(variant: CaptureVariant, path: string): string {
  return `${variant}:${path}`;
}
