/**
 * Applies supabase/migrations/*.sql to a throwaway database on a local Postgres (with a stub of Supabase's
 * auth schema and roles) and checks RLS. Skips when no server is reachable.
 * Connection: PG_TEST_URL (default postgres://postgres:postgres@localhost:5432/postgres).
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const baseUrl = process.env.PG_TEST_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const dbName = `hashline_test_${process.pid}_${Date.now()}`;
const testUrl = baseUrl.replace(/\/[^/]*$/, `/${dbName}`);
const root = resolve(import.meta.dirname, "../..");

function psql(url: string, sql: string): string {
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function psqlFile(url: string, file: string): void {
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", file], { stdio: ["ignore", "ignore", "pipe"] });
}

/** Run SQL as an API role, the way PostgREST does (role + JWT sub claim). */
function as(role: "anon" | "authenticated", sub: string | null, sql: string): string {
  const claim = sub ? `set local request.jwt.claim.sub = '${sub}';` : "";
  return psql(testUrl, `begin; set local role ${role}; ${claim} ${sql}; commit;`);
}

let available = true;
try {
  psql(baseUrl, "select 1");
} catch {
  available = false;
}

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";

describe.skipIf(!available)("supabase migrations", () => {
  beforeAll(() => {
    psql(baseUrl, `create database ${dbName}`);
    psqlFile(testUrl, resolve(root, "tests/db/supabase-stub.sql"));
    const dir = resolve(root, "supabase/migrations");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) psqlFile(testUrl, resolve(dir, f));
    psqlFile(testUrl, resolve(root, "supabase/seed.sql"));
    psql(
      testUrl,
      `insert into auth.users (id, email) values ('${USER_A}', 'a@example.com'), ('${USER_B}', 'b@example.com'), ('${ADMIN}', 'admin@example.com');
       update public.profiles set role = 'admin' where id = '${ADMIN}';
       insert into public.price_alerts (user_id, coin_id, currency, direction, target, channel)
         values ('${USER_A}', 'bitcoin', 'NGN', 'above', 100000000, 'email'), ('${USER_B}', 'ethereum', 'KES', 'below', 300000, 'telegram');
       insert into public.directory_entries (slug, name, type) values ('pending-entry', 'Pending', 'exchange');`,
    );
  });

  afterAll(() => {
    if (available) psql(baseUrl, `drop database if exists ${dbName} with (force)`);
  });

  it("enables RLS on every public table", () => {
    const withoutRls = psql(
      testUrl,
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(withoutRls).toBe("");
    const count = Number(psql(testUrl, "select count(*) from pg_tables where schemaname = 'public'"));
    expect(count).toBe(12);
  });

  it("creates a profile for each new auth user", () => {
    expect(psql(testUrl, `select display_name from public.profiles where id = '${USER_A}'`)).toBe("a");
  });

  it("user A cannot read user B's alerts", () => {
    expect(as("authenticated", USER_A, "select coin_id from public.price_alerts")).toBe("bitcoin");
    expect(as("authenticated", USER_B, "select coin_id from public.price_alerts")).toBe("ethereum");
    expect(as("anon", null, "select count(*) from public.price_alerts")).toBe("0");
  });

  it("user cannot create an alert for someone else", () => {
    expect(() =>
      as("authenticated", USER_A, `insert into public.price_alerts (user_id, coin_id, currency, direction, target, channel) values ('${USER_B}', 'bitcoin', 'NGN', 'above', 1, 'email')`),
    ).toThrow(/row-level security/);
  });

  it("users cannot promote themselves to admin", () => {
    expect(() => as("authenticated", USER_A, `update public.profiles set role = 'admin' where id = '${USER_A}'`)).toThrow(
      /permission denied/,
    );
    as("authenticated", USER_A, `update public.profiles set display_name = 'Ada' where id = '${USER_A}'`);
    expect(psql(testUrl, `select display_name || ':' || role from public.profiles where id = '${USER_A}'`)).toBe("Ada:user");
  });

  it("subscribers are insert-only for the public and readable by admins", () => {
    as("anon", null, "insert into public.subscribers (email, country_code, source) values ('reader@example.com', 'ng', 'test:/news/x')");
    expect(as("anon", null, "select count(*) from public.subscribers")).toBe("0");
    expect(as("authenticated", USER_A, "select count(*) from public.subscribers")).toBe("0");
    expect(as("authenticated", ADMIN, "select count(*) from public.subscribers")).toBe("1");
    expect(() =>
      as("anon", null, "insert into public.subscribers (email, source, status) values ('x@example.com', 't', 'active')"),
    ).toThrow(/row-level security/);
  });

  it("public reference data is readable; writes are admin-only", () => {
    expect(Number(as("anon", null, "select count(*) from public.p2p_rates"))).toBeGreaterThan(0);
    expect(() => as("anon", null, "insert into public.p2p_rates (country_code, asset, fiat, buy, sell, source) values ('ng','USDT','NGN',1,1,'x')")).toThrow(
      /row-level security/,
    );
    expect(() =>
      as("authenticated", USER_A, "insert into public.airdrops (name) values ('Fake drop')"),
    ).toThrow(/row-level security/);
    as("authenticated", ADMIN, "insert into public.airdrops (name) values ('Admin drop')");
  });

  it("unpublished directory entries are hidden from the public", () => {
    expect(as("anon", null, "select count(*) from public.directory_entries where slug = 'pending-entry'")).toBe("0");
    expect(as("authenticated", ADMIN, "select count(*) from public.directory_entries where slug = 'pending-entry'")).toBe("1");
  });

  it("only approved reviews are public", () => {
    const entry = psql(testUrl, "select id from public.directory_entries where slug = 'sample-wallet'");
    as("authenticated", USER_A, `insert into public.directory_reviews (entry_id, user_id, rating, body) values ('${entry}', '${USER_A}', 5, 'Great')`);
    expect(as("anon", null, "select count(*) from public.directory_reviews")).toBe("0");
    expect(as("authenticated", USER_A, "select count(*) from public.directory_reviews")).toBe("1");
    expect(() =>
      as("authenticated", USER_A, `insert into public.directory_reviews (entry_id, user_id, rating, status) values ('${entry}', '${USER_A}', 5, 'approved')`),
    ).toThrow(/row-level security/);
  });

  it("migration files are numbered", () => {
    const files = readdirSync(resolve(root, "supabase/migrations"));
    for (const f of files) expect(f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    expect(readFileSync(resolve(root, "supabase/migrations", files[0] as string), "utf8")).toContain("enable row level security");
  });
});
