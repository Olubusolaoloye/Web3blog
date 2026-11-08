/**
 * CDN caching for public pages whose HTML depends only on the URL plus the hl_country / hl_theme cookies.
 * CLAUDE.md §7.3: `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
 *
 * - `Netlify-Vary` keys the CDN cache on just those two cookies (Netlify ignores the rest of the Cookie header).
 * - A response that sets a cookie (first visit, geo-detected country) must never be shared: private, no-store.
 */
export const PUBLIC_PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export function publicPageHeaders({ parentHeaders, loaderHeaders }: { parentHeaders: Headers; loaderHeaders: Headers }): Headers {
  const headers = new Headers(parentHeaders);
  loaderHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") headers.append(key, value);
    else headers.set(key, value);
  });
  if (headers.has("Set-Cookie")) {
    headers.set("Cache-Control", "private, no-store");
  } else {
    headers.set("Cache-Control", PUBLIC_PAGE_CACHE);
    headers.set("Netlify-Vary", "cookie=hl_country|hl_theme");
    headers.set("Vary", "Cookie");
  }
  return headers;
}
