import { createHmac, timingSafeEqual } from "node:crypto";
import type { CachePurger } from "./purge.server";

export const SIGNATURE_HEADER = "sanity-webhook-signature";
const MAX_AGE_MS = 5 * 60 * 1000;

/** Sanity webhook signature: `t=<unix ms>,v1=<base64url(HMAC-SHA256(secret, "<t>.<body>"))>`. */
export function signPayload(body: string, secret: string, timestamp: number): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("base64url");
  return `t=${timestamp},v1=${sig}`;
}

export function verifySignature(body: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1 || Math.abs(now - t) > MAX_AGE_MS) return false;
  const expected = Buffer.from(signPayload(body, secret, t).split("v1=")[1] as string);
  const actual = Buffer.from(parts.v1);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Cache tags to purge for a published document (CLAUDE.md §5: the article, the homepage and the sitemaps). */
export function tagsFor(doc: { _type?: string; slug?: string }): string[] {
  switch (doc._type) {
    case "article":
      return [...(doc.slug ? [`article:${doc.slug}`] : []), "home", "news-index", "sitemaps"];
    case "sponsoredPost":
      return [...(doc.slug ? [`press:${doc.slug}`] : []), "press", "sitemaps"];
    case "author":
      return [...(doc.slug ? [`author:${doc.slug}`] : []), "sitemaps"];
    default:
      return ["home"];
  }
}

export async function handleRevalidate(
  request: Request,
  deps: { secret: string | undefined; purger: CachePurger; now?: number },
): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!deps.secret) return Response.json({ error: "Revalidation is not configured" }, { status: 503 });
  const body = await request.text();
  if (!verifySignature(body, request.headers.get(SIGNATURE_HEADER), deps.secret, deps.now)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let doc: { _type?: string; slug?: string | { current?: string } };
  try {
    doc = JSON.parse(body) as typeof doc;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = typeof doc.slug === "string" ? doc.slug : doc.slug?.current;
  const tags = tagsFor({ _type: doc._type, slug });
  await deps.purger.purgeTags(tags);
  return Response.json({ revalidated: true, tags, purger: deps.purger.name });
}
