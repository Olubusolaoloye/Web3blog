import { isSanityConfigured } from "~/lib/sanity/config";
import { fixtureSource } from "./fixture-source";
import { sanitySource } from "./sanity-source.server";
import type { ContentSource } from "./types";

/** Sanity when a project id is configured; otherwise the local seed fixtures. */
export function getContentSource(): ContentSource {
  return isSanityConfigured() ? sanitySource : fixtureSource;
}
