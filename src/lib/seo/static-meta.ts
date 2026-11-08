import { breadcrumbJsonLd, graph } from "./jsonld";
import { buildMeta } from "./meta";

/** Meta for simple static pages: title, description, canonical path and a breadcrumb trail. */
export function staticMeta(title: string, path: string, description: string) {
  return buildMeta({
    title,
    description,
    path,
    jsonLd: graph(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: title, path }])),
  });
}
