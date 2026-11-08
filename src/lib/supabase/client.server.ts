import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let admin: SupabaseClient<Database> | undefined;

/**
 * Service-role client: bypasses RLS. Server-only (the `.server` suffix keeps it out of client bundles).
 * Use only inside route actions/loaders after validating input and checking permissions.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured: set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  admin ??= createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
