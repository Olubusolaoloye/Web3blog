import { z } from "zod";
import { launchedCountries } from "~/config/countries";

export { captureSource, captureVariants, type CaptureVariant } from "./source";

/** Newsletter sign-up: email + country, optional experience level (CLAUDE.md §8). */
export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address." })),
  country: z.enum(launchedCountries.map((c) => c.code) as [string, ...string[]], { message: "Choose your country." }),
  experience: z.enum(["beginner", "intermediate", "advanced"]).optional().or(z.literal("").transform(() => undefined)),
  source: z.string().trim().min(1).max(200),
  /** Comma-separated topics, e.g. "price-alerts" from the AlertCTA. */
  interests: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()) : []))
    .pipe(z.array(z.enum(["news", "price-alerts", "safety", "research"])).max(4)),
  /** Honeypot: real users never fill this in. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
