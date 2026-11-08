import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/supabase/database.types";
import { BeehiivProvider, NoNewsletterProvider, type NewsletterProvider } from "~/lib/newsletter/beehiiv.server";
import { LiveNotifier, OutboxNotifier, type Notifier } from "~/lib/messaging/notify.server";
import { ManualInvoiceProvider, type PaymentProvider } from "~/lib/payments/provider.server";
import { MemoryRateLimiter, UpstashRateLimiter, type RateLimiter } from "./rate-limit.server";
import { MemoryCaptureStore, SupabaseCaptureStore, type CaptureStore } from "./stores.server";

export interface CaptureDeps {
  store: CaptureStore;
  newsletter: NewsletterProvider;
  notifier: Notifier;
  payments: PaymentProvider;
  limiter: RateLimiter;
}

export function createCaptureDeps(env: Record<string, string | undefined> = process.env): CaptureDeps {
  const supabase = Boolean(env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  const notifierConfigured = Boolean(
    (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_TEAM_CHAT_ID) || env.SLACK_WEBHOOK_URL || (env.RESEND_API_KEY && env.EMAIL_FROM),
  );
  return {
    store: supabase
      ? new SupabaseCaptureStore(
          // Service role: server only, used after validation + rate limiting (CLAUDE.md §6, rule 5).
          createClient<Database>(env.VITE_SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
            auth: { persistSession: false, autoRefreshToken: false },
          }),
        )
      : new MemoryCaptureStore(),
    newsletter:
      env.BEEHIIV_API_KEY && env.BEEHIIV_PUBLICATION_ID
        ? new BeehiivProvider(env.BEEHIIV_PUBLICATION_ID, env.BEEHIIV_API_KEY)
        : new NoNewsletterProvider(),
    notifier: notifierConfigured
      ? new LiveNotifier({
          telegramToken: env.TELEGRAM_BOT_TOKEN,
          telegramTeamChatId: env.TELEGRAM_TEAM_CHAT_ID,
          slackWebhookUrl: env.SLACK_WEBHOOK_URL,
          resendApiKey: env.RESEND_API_KEY,
          emailFrom: env.EMAIL_FROM,
          teamEmail: env.TEAM_NOTIFY_EMAIL,
        })
      : new OutboxNotifier(),
    payments: new ManualInvoiceProvider(),
    limiter:
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? new UpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
        : new MemoryRateLimiter(),
  };
}

let deps: CaptureDeps | undefined;
export function getCaptureDeps(): CaptureDeps {
  deps ??= createCaptureDeps();
  return deps;
}

/** Tests replace dependencies with fakes. */
export function setCaptureDeps(next: CaptureDeps | undefined): void {
  deps = next;
}
