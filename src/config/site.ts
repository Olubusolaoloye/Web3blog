/**
 * The ONLY place the brand name lives (CLAUDE.md §13 rule 8).
 * Everything user-facing reads `site.name` / `site.tagline` from here.
 */
const brandName = "Hashline";
const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) || "http://localhost:5173";

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
  footerNav: [
    {
      heading: "Read",
      links: [
        { label: "News", href: "/news" },
        { label: "Research", href: "/research" },
        { label: "Learn", href: "/learn" },
        { label: "Safety Desk", href: "/safety" },
      ],
    },
    {
      heading: "Trust",
      links: [
        { label: "About", href: "/about" },
        { label: "Editorial standards", href: "/standards" },
        { label: "Corrections", href: "/corrections" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      heading: "Business",
      links: [
        { label: "Partners & advertising", href: "/partners" },
        { label: "Press releases", href: "/press" },
        { label: "Directory", href: "/directory" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Disclaimer", href: "/disclaimer" },
      ],
    },
  ],
} as const;

export type Site = typeof site;
