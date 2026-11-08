-- 0001_init.sql — core schema (CLAUDE.md §6). RLS is enabled on every table.
-- The service role bypasses RLS; server route actions use it for anonymous inserts after Zod validation + rate limiting.

-- profiles ---------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  country_code text check (country_code ~ '^[a-z]{2}$'),
  currency text check (currency ~ '^[A-Z]{3}$'),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  interests text[] not null default '{}',
  role text not null default 'user' check (role in ('user', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

-- Admin check used by policies. SECURITY DEFINER so it can read profiles regardless of the caller's RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- subscribers ----------------------------------------------------------------------------------
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  country_code text check (country_code ~ '^[a-z]{2}$'),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  interests text[] not null default '{}',
  source text not null, -- capture component + path, e.g. 'end-of-article:/news/slug'
  utm jsonb not null default '{}'::jsonb,
  beehiiv_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed', 'bounced')),
  created_at timestamptz not null default now()
);
create index subscribers_created_at_idx on public.subscribers (created_at desc);
create index subscribers_source_idx on public.subscribers (source);

-- watchlists -----------------------------------------------------------------------------------
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  coin_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, coin_id)
);

-- price_alerts ---------------------------------------------------------------------------------
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  coin_id text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  direction text not null check (direction in ('above', 'below')),
  target numeric not null check (target > 0),
  channel text not null check (channel in ('email', 'telegram', 'whatsapp')),
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index price_alerts_active_coin_idx on public.price_alerts (coin_id, currency) where active;
create index price_alerts_user_idx on public.price_alerts (user_id);

-- telegram_links -------------------------------------------------------------------------------
create table public.telegram_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  chat_id bigint not null unique,
  linked_at timestamptz not null default now()
);

-- risk_scans -----------------------------------------------------------------------------------
create table public.risk_scans (
  id uuid primary key default gen_random_uuid(),
  chain text not null,
  contract_address text not null,
  result jsonb not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'unknown')),
  provider text not null,
  scanned_at timestamptz not null default now(),
  requested_by uuid references public.profiles (id) on delete set null,
  unique (chain, contract_address, provider)
);

-- airdrops -------------------------------------------------------------------------------------
create table public.airdrops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_url text,
  chain text,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  safety_level text not null default 'unknown' check (safety_level in ('low', 'medium', 'high', 'unknown')),
  requirements jsonb not null default '[]'::jsonb,
  ends_at timestamptz,
  verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- p2p_rates ------------------------------------------------------------------------------------
create table public.p2p_rates (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[a-z]{2}$'),
  asset text not null,
  fiat text not null check (fiat ~ '^[A-Z]{3}$'),
  buy numeric not null check (buy > 0),
  sell numeric not null check (sell > 0),
  source text not null,
  captured_at timestamptz not null default now()
);
create index p2p_rates_lookup_idx on public.p2p_rates (country_code, asset, captured_at desc);

-- directory ------------------------------------------------------------------------------------
create table public.directory_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  type text not null check (type in ('exchange', 'wallet', 'project', 'agency', 'service', 'event', 'professional')),
  countries text[] not null default '{}',
  website text,
  description text,
  logo_url text,
  tier text not null default 'free' check (tier in ('free', 'verified', 'featured')),
  kyb_status text not null default 'none',
  owner_email text,
  rating_avg numeric,
  -- "Get listed" submissions stay unpublished until an admin approves them (CLAUDE.md §7.10).
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.directory_reviews (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.directory_entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index directory_reviews_entry_idx on public.directory_reviews (entry_id) where status = 'approved';

-- B2B ------------------------------------------------------------------------------------------
create table public.b2b_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  website text,
  telegram text,
  service text,
  budget_range text,
  countries text[] not null default '{}',
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  source text not null,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index b2b_leads_created_at_idx on public.b2b_leads (created_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.b2b_leads (id) on delete restrict,
  package_code text not null,
  amount_usd numeric not null check (amount_usd >= 0),
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid', 'cancelled', 'refunded')),
  payment_ref text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscribers enable row level security;
alter table public.watchlists enable row level security;
alter table public.price_alerts enable row level security;
alter table public.telegram_links enable row level security;
alter table public.risk_scans enable row level security;
alter table public.airdrops enable row level security;
alter table public.p2p_rates enable row level security;
alter table public.directory_entries enable row level security;
alter table public.directory_reviews enable row level security;
alter table public.b2b_leads enable row level security;
alter table public.orders enable row level security;

-- profiles: own row only. Users can't change their own role (column privileges below).
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Role changes go through server-side admin actions using the service role (CLAUDE.md §13 rule 5).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, country_code, currency, experience_level, interests) on public.profiles to authenticated;

-- watchlists / price_alerts / telegram_links: owner only.
create policy "watchlists: own" on public.watchlists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "price_alerts: own" on public.price_alerts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "telegram_links: own" on public.telegram_links for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- subscribers / b2b_leads / orders: insert-only for the public, read/manage for admins.
create policy "subscribers: public insert" on public.subscribers for insert to anon, authenticated
  with check (status = 'pending' and beehiiv_id is null);
create policy "subscribers: admin all" on public.subscribers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "b2b_leads: public insert" on public.b2b_leads for insert to anon, authenticated
  with check (status = 'new');
create policy "b2b_leads: admin all" on public.b2b_leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "orders: public insert" on public.orders for insert to anon, authenticated
  with check (status = 'pending' and payment_ref is null);
create policy "orders: admin all" on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Public reference data: readable by everyone, writable by admins (and the service role, which bypasses RLS).
create policy "risk_scans: public read" on public.risk_scans for select to anon, authenticated using (true);
create policy "risk_scans: admin write" on public.risk_scans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "airdrops: public read" on public.airdrops for select to anon, authenticated using (true);
create policy "airdrops: admin write" on public.airdrops for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "p2p_rates: public read" on public.p2p_rates for select to anon, authenticated using (true);
create policy "p2p_rates: admin write" on public.p2p_rates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "directory_entries: public read published" on public.directory_entries for select to anon, authenticated
  using (published or public.is_admin());
create policy "directory_entries: admin write" on public.directory_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- directory_reviews: any signed-in user can submit (pending); only approved reviews are public.
create policy "directory_reviews: insert own pending" on public.directory_reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "directory_reviews: read approved or own" on public.directory_reviews for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "directory_reviews: admin manage" on public.directory_reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
