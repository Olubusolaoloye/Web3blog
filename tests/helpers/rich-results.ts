/**
 * Local stand-in for Google's Rich Results Test, covering the properties Google documents for
 * Article/NewsArticle (https://developers.google.com/search/docs/appearance/structured-data/article),
 * BreadcrumbList and FAQPage. Returns a list of errors; empty means valid.
 */
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isAbsUrl = (v: unknown) => typeof v === "string" && /^https?:\/\/[^\s]+$/.test(v);
const ISO_WITH_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function nodesOf(doc: unknown): Obj[] {
  if (!isObj(doc)) return [];
  if (Array.isArray(doc["@graph"])) return doc["@graph"].filter(isObj);
  return [doc];
}

export function validateArticle(node: Obj, type: "NewsArticle" | "Article" = "NewsArticle"): string[] {
  const errors: string[] = [];
  if (node["@type"] !== type) errors.push(`@type must be ${type}`);
  const headline = node.headline;
  if (typeof headline !== "string" || !headline.trim()) errors.push("headline is required");
  else if (headline.length > 110) errors.push("headline must be at most 110 characters");

  const images = Array.isArray(node.image) ? node.image : [node.image];
  if (!images.length || !images.every((i) => isAbsUrl(i) || (isObj(i) && isAbsUrl(i.url)))) {
    errors.push("image must be one or more absolute URLs");
  }
  for (const key of ["datePublished", "dateModified"] as const) {
    if (typeof node[key] !== "string" || !ISO_WITH_TZ.test(node[key] as string)) errors.push(`${key} must be ISO 8601 with a timezone`);
  }
  if (typeof node.datePublished === "string" && typeof node.dateModified === "string" && node.dateModified < node.datePublished) {
    errors.push("dateModified must not be before datePublished");
  }
  const authors = Array.isArray(node.author) ? node.author : [node.author];
  if (!authors.length || authors.some((a) => !isObj(a))) errors.push("author is required");
  for (const a of authors.filter(isObj)) {
    if (!["Person", "Organization"].includes(String(a["@type"]))) errors.push("author @type must be Person or Organization");
    if (typeof a.name !== "string" || !a.name) errors.push("author.name is required");
    if (!isAbsUrl(a.url)) errors.push("author.url must be an absolute URL");
  }
  const pub = node.publisher;
  if (!isObj(pub) || typeof pub.name !== "string") errors.push("publisher.name is required");
  else if (!isObj(pub.logo) || !isAbsUrl(pub.logo.url)) errors.push("publisher.logo.url must be an absolute URL");
  return errors;
}

export function validateBreadcrumbs(node: Obj): string[] {
  const errors: string[] = [];
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length < 2) return ["BreadcrumbList needs at least 2 items"];
  items.forEach((item, i) => {
    if (!isObj(item)) return errors.push(`item ${i} is not an object`);
    if (item.position !== i + 1) errors.push(`item ${i} position must be ${i + 1}`);
    if (typeof item.name !== "string" || !item.name) errors.push(`item ${i} needs a name`);
    if (i < items.length - 1 && !isAbsUrl(item.item)) errors.push(`item ${i} needs an absolute item URL`);
  });
  return errors;
}

export function validateFaq(node: Obj): string[] {
  const qs = node.mainEntity;
  if (!Array.isArray(qs) || !qs.length) return ["FAQPage needs mainEntity questions"];
  return qs.flatMap((q, i) =>
    isObj(q) && q["@type"] === "Question" && typeof q.name === "string" && isObj(q.acceptedAnswer) && typeof q.acceptedAnswer.text === "string"
      ? []
      : [`question ${i} is incomplete`],
  );
}
