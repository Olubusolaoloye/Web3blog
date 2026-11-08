import type { DirectoryEntryRow } from "~/lib/supabase/database.types";
import { getSupabasePublic } from "~/lib/supabase/public.server";

export type DirectoryEntry = Pick<DirectoryEntryRow, "slug" | "name" | "type" | "countries" | "website" | "description" | "logo_url" | "tier">;

/** Reads directory entries (Supabase, public + published only via RLS). Full directory UI is Phase 7. */
export interface DirectoryProvider {
  readonly name: string;
  /** Verified or featured entries with these slugs (CLAUDE.md §7.4: "verified only"). */
  verifiedBySlugs(slugs: readonly string[]): Promise<DirectoryEntry[]>;
}

const VERIFIED = ["verified", "featured"] as const;

export class SupabaseDirectoryProvider implements DirectoryProvider {
  readonly name = "supabase";
  async verifiedBySlugs(slugs: readonly string[]): Promise<DirectoryEntry[]> {
    const db = getSupabasePublic();
    if (!db || slugs.length === 0) return [];
    const { data, error } = await db
      .from("directory_entries")
      .select("slug, name, type, countries, website, description, logo_url, tier")
      .in("slug", [...slugs])
      .in("tier", [...VERIFIED]);
    if (error || !data) return [];
    return slugs.map((s) => data.find((d) => d.slug === s)).filter((d): d is DirectoryEntry => Boolean(d));
  }
}

/** Mirrors supabase/seed.sql so local dev shows the same sample entries. */
export const FIXTURE_DIRECTORY: DirectoryEntry[] = [
  { slug: "sample-exchange-ng", name: "Sample Exchange NG", type: "exchange", countries: ["ng"], website: "https://example.com", description: "Placeholder exchange for development.", logo_url: null, tier: "verified" },
  { slug: "sample-exchange-ke", name: "Sample Exchange KE", type: "exchange", countries: ["ke"], website: "https://example.com", description: "Placeholder exchange for development.", logo_url: null, tier: "verified" },
  { slug: "sample-wallet", name: "Sample Wallet", type: "wallet", countries: ["ng", "ke", "za", "gh"], website: "https://example.com", description: "Placeholder wallet for development.", logo_url: null, tier: "free" },
];

export const fixtureDirectoryProvider: DirectoryProvider = {
  name: "fixtures",
  async verifiedBySlugs(slugs) {
    return slugs
      .map((s) => FIXTURE_DIRECTORY.find((d) => d.slug === s))
      .filter((d): d is DirectoryEntry => Boolean(d) && (VERIFIED as readonly string[]).includes((d as DirectoryEntry).tier));
  },
};

export function getDirectoryProvider(): DirectoryProvider {
  return getSupabasePublic() ? new SupabaseDirectoryProvider() : fixtureDirectoryProvider;
}
