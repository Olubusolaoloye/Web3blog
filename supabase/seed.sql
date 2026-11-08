-- Development seed data (sample values, not real market data). Applied by `supabase db reset`.
insert into public.p2p_rates (country_code, asset, fiat, buy, sell, source, captured_at) values
  ('ng', 'USDT', 'NGN', 1545, 1528, 'manual', now()),
  ('ke', 'USDT', 'KES', 130.2, 128.6, 'manual', now()),
  ('za', 'USDT', 'ZAR', 18.3, 18.0, 'manual', now()),
  ('gh', 'USDT', 'GHS', 15.9, 15.5, 'manual', now());

insert into public.directory_entries (slug, name, type, countries, website, description, tier, kyb_status, published) values
  ('sample-exchange-ng', 'Sample Exchange NG', 'exchange', '{ng}', 'https://example.com', 'Placeholder exchange for development.', 'verified', 'approved', true),
  ('sample-exchange-ke', 'Sample Exchange KE', 'exchange', '{ke}', 'https://example.com', 'Placeholder exchange for development.', 'verified', 'approved', true),
  ('sample-wallet', 'Sample Wallet', 'wallet', '{ng,ke,za,gh}', 'https://example.com', 'Placeholder wallet for development.', 'free', 'none', true);

insert into public.airdrops (name, project_url, chain, status, safety_level, requirements, ends_at, verified, notes) values
  ('Sample Airdrop', 'https://example.com', 'base', 'active', 'low', '["Bridge to Base", "Make one swap"]', now() + interval '14 days', true, 'Development sample.');
