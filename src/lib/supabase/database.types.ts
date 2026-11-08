/**
 * Hand-written to mirror supabase/migrations/0001_init.sql until a project is linked.
 * Regenerate from the live schema with `pnpm db:types` (overwrites this file).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = T;
type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

// Type aliases (not interfaces) so rows satisfy supabase-js's Record<string, unknown> constraint.
type Table<R, O extends keyof R> = {
  Row: Row<R>;
  Insert: Insert<R, O>;
  Update: Update<R>;
  Relationships: [];
};

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type UserRole = "user" | "editor" | "admin";
export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  country_code: string | null;
  currency: string | null;
  experience_level: ExperienceLevel | null;
  interests: string[];
  role: UserRole;
  created_at: string;
};
export type SubscriberRow = {
  id: string;
  email: string;
  country_code: string | null;
  experience_level: ExperienceLevel | null;
  interests: string[];
  source: string;
  utm: Json;
  beehiiv_id: string | null;
  status: "pending" | "active" | "unsubscribed" | "bounced";
  created_at: string;
};
export type WatchlistRow = {
  id: string;
  user_id: string;
  coin_id: string;
  created_at: string;
};
export type PriceAlertRow = {
  id: string;
  user_id: string;
  coin_id: string;
  currency: string;
  direction: "above" | "below";
  target: number;
  channel: "email" | "telegram" | "whatsapp";
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
};
export type TelegramLinkRow = {
  user_id: string;
  chat_id: number;
  linked_at: string;
};
export type RiskScanRow = {
  id: string;
  chain: string;
  contract_address: string;
  result: Json;
  risk_level: RiskLevel;
  provider: string;
  scanned_at: string;
  requested_by: string | null;
};
export type AirdropRow = {
  id: string;
  name: string;
  project_url: string | null;
  chain: string | null;
  status: "upcoming" | "active" | "ended";
  safety_level: RiskLevel;
  requirements: Json;
  ends_at: string | null;
  verified: boolean;
  notes: string | null;
  created_at: string;
};
export type P2pRateRow = {
  id: string;
  country_code: string;
  asset: string;
  fiat: string;
  buy: number;
  sell: number;
  source: string;
  captured_at: string;
};
export type DirectoryEntryRow = {
  id: string;
  slug: string;
  name: string;
  type: "exchange" | "wallet" | "project" | "agency" | "service" | "event" | "professional";
  countries: string[];
  website: string | null;
  description: string | null;
  logo_url: string | null;
  tier: "free" | "verified" | "featured";
  kyb_status: string;
  owner_email: string | null;
  rating_avg: number | null;
  published: boolean;
  created_at: string;
};
export type DirectoryReviewRow = {
  id: string;
  entry_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
export type B2bLeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  telegram: string | null;
  service: string | null;
  budget_range: string | null;
  countries: string[];
  message: string | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost" | "spam";
  source: string;
  utm: Json;
  created_at: string;
};
export type OrderRow = {
  id: string;
  lead_id: string;
  package_code: string;
  amount_usd: number;
  status: "pending" | "invoiced" | "paid" | "cancelled" | "refunded";
  payment_ref: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "display_name" | "country_code" | "currency" | "experience_level" | "interests" | "role" | "created_at">;
      subscribers: Table<SubscriberRow, "id" | "country_code" | "experience_level" | "interests" | "utm" | "beehiiv_id" | "status" | "created_at">;
      watchlists: Table<WatchlistRow, "id" | "created_at">;
      price_alerts: Table<PriceAlertRow, "id" | "active" | "last_triggered_at" | "created_at">;
      telegram_links: Table<TelegramLinkRow, "linked_at">;
      risk_scans: Table<RiskScanRow, "id" | "scanned_at" | "requested_by">;
      airdrops: Table<AirdropRow, "id" | "project_url" | "chain" | "status" | "safety_level" | "requirements" | "ends_at" | "verified" | "notes" | "created_at">;
      p2p_rates: Table<P2pRateRow, "id" | "captured_at">;
      directory_entries: Table<DirectoryEntryRow, "id" | "countries" | "website" | "description" | "logo_url" | "tier" | "kyb_status" | "owner_email" | "rating_avg" | "published" | "created_at">;
      directory_reviews: Table<DirectoryReviewRow, "id" | "body" | "status" | "created_at">;
      b2b_leads: Table<B2bLeadRow, "id" | "company" | "website" | "telegram" | "service" | "budget_range" | "countries" | "message" | "status" | "utm" | "created_at">;
      orders: Table<OrderRow, "id" | "status" | "payment_ref" | "created_at">;
    };
    Views: { [_ in never]: never };
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
