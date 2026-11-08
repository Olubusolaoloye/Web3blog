import type { Route } from "./+types/og.$type.$slug";
import { site } from "~/config/site";
import { getContentSource } from "~/lib/content/source.server";
import { renderOgPng, type OgInput } from "~/lib/seo/og.server";

/** Dynamic social images: /og/article/<slug>.png, /og/press/<slug>.png, /og/page/<anything>.png. Cached 1 day. */
export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug.replace(/\.png$/, "");
  const content = getContentSource();
  let input: OgInput | undefined;

  if (params.type === "article") {
    const a = await content.getArticle(slug);
    if (a) input = { kicker: a.category?.title ?? "News", title: a.title, subtitle: a.bottomLine[0] };
  } else if (params.type === "press") {
    const p = await content.getSponsoredPost(slug);
    if (p) input = { kicker: p.kind === "pressRelease" ? "Press release" : "Sponsored", title: p.title, subtitle: p.bottomLine[0], tone: "warning" };
  } else if (params.type === "page") {
    input = { title: site.tagline, subtitle: site.description };
  }

  if (!input) return new Response("Not found", { status: 404 });
  const png = await renderOgPng(input);
  return new Response(png as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      "Netlify-Cache-Tag": params.type === "article" ? `article:${slug}` : `og:${params.type}`,
    },
  });
}
