import type { SupabaseClient } from "@supabase/supabase-js";
import type { B2bLeadRow, Database, ExperienceLevel, Json, OrderRow, SubscriberRow } from "~/lib/supabase/database.types";

export interface NewSubscriber {
  email: string;
  country_code: string;
  experience_level?: ExperienceLevel;
  interests: string[];
  source: string;
  utm: Record<string, string>;
}

export interface NewLead {
  name: string;
  email: string;
  company?: string;
  website?: string;
  telegram?: string;
  service: string;
  budget_range?: string;
  countries: string[];
  message?: string;
  source: string;
  utm: Record<string, string>;
}

export interface NewOrder {
  lead_id: string;
  package_code: string;
  amount_usd: number;
  payment_ref: string;
}

export interface SubscriberStore {
  /** Inserts unless the email already exists (first capture keeps its source). */
  addSubscriber(s: NewSubscriber): Promise<{ id: string; created: boolean }>;
  markSubscriberActive(id: string, beehiivId: string): Promise<void>;
}

export interface LeadStore {
  createLead(l: NewLead): Promise<string>;
  createOrder(o: NewOrder): Promise<string>;
}

export type CaptureStore = SubscriberStore & LeadStore & { readonly name: string };

/** Supabase (service role, server only). RLS still applies to every other client. */
export class SupabaseCaptureStore implements CaptureStore {
  readonly name = "supabase";
  constructor(private readonly db: SupabaseClient<Database>) {}

  async addSubscriber(s: NewSubscriber) {
    const { data, error } = await this.db
      .from("subscribers")
      .upsert({ ...s, utm: s.utm as Json, status: "pending" }, { onConflict: "email", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`subscribers insert failed: ${error.message}`);
    if (data && data.length > 0) return { id: (data[0] as { id: string }).id, created: true };
    const existing = await this.db.from("subscribers").select("id").eq("email", s.email).single();
    if (existing.error) throw new Error(`subscribers lookup failed: ${existing.error.message}`);
    return { id: existing.data.id, created: false };
  }

  async markSubscriberActive(id: string, beehiivId: string) {
    const { error } = await this.db.from("subscribers").update({ status: "active", beehiiv_id: beehiivId }).eq("id", id);
    if (error) throw new Error(`subscribers update failed: ${error.message}`);
  }

  async createLead(l: NewLead) {
    const { data, error } = await this.db
      .from("b2b_leads")
      .insert({ ...l, utm: l.utm as Json, status: "new" })
      .select("id")
      .single();
    if (error) throw new Error(`b2b_leads insert failed: ${error.message}`);
    return data.id;
  }

  async createOrder(o: NewOrder) {
    const { data, error } = await this.db.from("orders").insert({ ...o, status: "pending" }).select("id").single();
    if (error) throw new Error(`orders insert failed: ${error.message}`);
    return data.id;
  }
}

/** In-memory store for local dev and e2e (inspectable via /api/test-outbox in E2E_TEST_MODE). */
export class MemoryCaptureStore implements CaptureStore {
  readonly name = "memory";
  subscribers: SubscriberRow[] = [];
  leads: B2bLeadRow[] = [];
  orders: OrderRow[] = [];

  async addSubscriber(s: NewSubscriber) {
    const existing = this.subscribers.find((x) => x.email === s.email);
    if (existing) return { id: existing.id, created: false };
    const row: SubscriberRow = {
      id: crypto.randomUUID(),
      email: s.email,
      country_code: s.country_code,
      experience_level: s.experience_level ?? null,
      interests: s.interests,
      source: s.source,
      utm: s.utm,
      beehiiv_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    this.subscribers.push(row);
    return { id: row.id, created: true };
  }

  async markSubscriberActive(id: string, beehiivId: string) {
    const row = this.subscribers.find((x) => x.id === id);
    if (row) Object.assign(row, { status: "active", beehiiv_id: beehiivId });
  }

  async createLead(l: NewLead) {
    const row: B2bLeadRow = {
      id: crypto.randomUUID(),
      name: l.name,
      email: l.email,
      company: l.company ?? null,
      website: l.website ?? null,
      telegram: l.telegram ?? null,
      service: l.service,
      budget_range: l.budget_range ?? null,
      countries: l.countries,
      message: l.message ?? null,
      status: "new",
      source: l.source,
      utm: l.utm,
      created_at: new Date().toISOString(),
    };
    this.leads.push(row);
    return row.id;
  }

  async createOrder(o: NewOrder) {
    const row: OrderRow = { id: crypto.randomUUID(), ...o, status: "pending", created_at: new Date().toISOString() };
    this.orders.push(row);
    return row.id;
  }

  reset() {
    this.subscribers = [];
    this.leads = [];
    this.orders = [];
  }
}
