import { z } from "zod";
import { launchedCountries } from "~/config/countries";
import { packageCodes } from "~/lib/content/types";

export const budgetRanges = [
  { value: "under-1k", label: "Under $1,000" },
  { value: "1k-5k", label: "$1,000 – $5,000" },
  { value: "5k-15k", label: "$5,000 – $15,000" },
  { value: "15k-plus", label: "$15,000+" },
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const countryCodes = launchedCountries.map((c) => c.code) as [string, ...string[]];

/** B2B booking form (CLAUDE.md §7.12). `fax_number` is the honeypot; `website` is a real field here. */
export const leadSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email address." })),
  company: optionalText(120),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.url({ protocol: /^https?$/, message: "Enter a full website address, starting with https://" }).optional()),
  telegram: optionalText(64).pipe(z.string().regex(/^@?[A-Za-z0-9_]{3,64}$/, "Enter a Telegram username like @yourname.").optional()),
  package: z.enum(packageCodes, { message: "Choose a package." }),
  budget: z.enum(["under-1k", "1k-5k", "5k-15k", "15k-plus"]).optional().or(z.literal("").transform(() => undefined)),
  countries: z.array(z.enum(countryCodes)).min(1, "Choose at least one country."),
  message: optionalText(2000).refine((v) => !v || (v.match(/https?:\/\//g) ?? []).length <= 3, "Please include no more than 3 links."),
  consent: z.literal("on", { message: "Please agree to be contacted about your booking." }),
  fax_number: z.string().max(0).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export function parseLeadForm(form: FormData) {
  const raw = Object.fromEntries(form);
  return leadSchema.safeParse({ ...raw, countries: form.getAll("countries") });
}
