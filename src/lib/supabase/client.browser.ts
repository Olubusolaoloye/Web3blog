import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let browser: SupabaseClient<Database> | undefined;

/** Anon-key client for the browser. Everything it can touch is governed by RLS. */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) throw new Error("Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  browser ??= createClient<Database>(url, key);
  return browser;
}
