import { site } from "~/config/site";
import { absoluteUrl } from "./meta";

export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export interface UrlEntry {
  path: string;
  lastmod?: string;
}

export function urlset(entries: readonly UrlEntry[]): string {
  const body = entries
    .map((e) => `  <url><loc>${xmlEscape(absoluteUrl(e.path))}</loc>${e.lastmod ? `<lastmod>${xmlEscape(e.lastmod)}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndex(paths: readonly string[], lastmod?: string): string {
  const body = paths
    .map((p) => `  <sitemap><loc>${xmlEscape(absoluteUrl(p))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export interface NewsEntry {
  path: string;
  title: string;
  publishedAt: string;
}

/** Google News sitemap: articles from the last 2 days only. */
export function newsSitemap(entries: readonly NewsEntry[]): string {
  const body = entries
    .map(
      (e) => `  <url>
    <loc>${xmlEscape(absoluteUrl(e.path))}</loc>
    <news:news>
      <news:publication><news:name>${xmlEscape(site.name)}</news:name><news:language>${site.locale}</news:language></news:publication>
      <news:publication_date>${xmlEscape(e.publishedAt)}</news:publication_date>
      <news:title>${xmlEscape(e.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${body}\n</urlset>\n`;
}

/** Child sitemaps listed in the index. Coins, converters, local hubs, directory and research join in later phases. */
export const SITEMAP_SECTIONS = ["articles", "pages"] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export const STATIC_PAGES = ["/", "/news", "/press", "/about", "/standards", "/corrections", "/contact", "/privacy", "/terms", "/disclaimer"];

export const NEWS_SITEMAP_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function xmlResponse(xml: string, tag = "sitemaps"): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "Netlify-Cache-Tag": tag,
    },
  });
}
