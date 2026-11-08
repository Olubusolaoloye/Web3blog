import { createClient, type SanityClient } from "@sanity/client";
import { sanityConfig } from "./config";

let client: SanityClient | undefined;

/** Server-only Sanity client. The read token never reaches the browser. */
export function getSanityClient(): SanityClient {
  client ??= createClient({
    projectId: sanityConfig.projectId,
    dataset: sanityConfig.dataset,
    apiVersion: sanityConfig.apiVersion,
    useCdn: !process.env.SANITY_API_READ_TOKEN,
    token: process.env.SANITY_API_READ_TOKEN || undefined,
    perspective: "published",
  });
  return client;
}
