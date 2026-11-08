/** Footer link groups. Server-only: the footer is rendered to HTML on the server (decision 42). */
export const footerNav = [
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
  ] as const;
