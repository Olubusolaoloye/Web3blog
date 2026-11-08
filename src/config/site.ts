/**
 * The ONLY place the brand name lives (CLAUDE.md §13 rule 8).
 * Everything user-facing reads `site.name` / `site.tagline` from here.
 */
const brandName = "Hashline";
// `import.meta.env` is undefined outside Vite (e.g. node scripts), hence the optional chaining.
const siteUrl = (import.meta.env?.VITE_SITE_URL as string | undefined) || "http://localhost:5173";

export const site = {
  name: brandName,
  tagline: "Crypto, clearly.",
  description:
    "Crypto news, local prices and safety tools for Africa and emerging markets. Sourced reporting, prices in your currency, no gambling content.",
  url: siteUrl.replace(/\/$/, ""),
  locale: "en",
  logoPath: "/logo.svg",
  titleTemplate: (title: string) => `${title} | ${brandName}`,
  socials: {
    x: "https://x.com/hashline",
    telegram: "https://t.me/hashline",
    whatsapp: "https://whatsapp.com/channel/hashline",
    linkedin: "https://www.linkedin.com/company/hashline",
  },
  contactEmail: "hello@hashline.example",
  nav: [
    { label: "News", href: "/news" },
    { label: "Markets", href: "/markets" },
    { label: "Local", href: "/local/ng" },
    { label: "Safety", href: "/safety" },
    { label: "Tools", href: "/tools/profit-calculator" },
    { label: "Learn", href: "/learn" },
  ],
} as const;

export type Site = typeof site;
