# Edge Functions

Added in Phase 6:

- `alerts-cron`: called every 5 minutes by `pg_cron`, protected by `CRON_SECRET`.
- `telegram-webhook`: verifies the signed `start` token and stores `chat_id` in `telegram_links`.
