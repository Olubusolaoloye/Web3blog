/**
 * Team notifications and transactional email (CLAUDE.md §8: B2B forms notify the team immediately).
 * Channels: Telegram bot → internal chat, Slack incoming webhook, Resend email. Each is optional.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Notifier {
  readonly channels: string[];
  /** Fan out to every configured team channel. Never throws; returns per-channel failures. */
  notifyTeam(text: string): Promise<string[]>;
  sendEmail(message: EmailMessage): Promise<void>;
}

type FetchLike = typeof fetch;

export async function sendTelegram(token: string, chatId: string, text: string, fetchImpl: FetchLike = fetch): Promise<void> {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}

export async function sendSlack(webhookUrl: string, text: string, fetchImpl: FetchLike = fetch): Promise<void> {
  const res = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Slack ${res.status}`);
}

export async function sendResend(apiKey: string, from: string, m: EmailMessage, fetchImpl: FetchLike = fetch): Promise<void> {
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

export interface NotifierConfig {
  telegramToken?: string;
  telegramTeamChatId?: string;
  slackWebhookUrl?: string;
  resendApiKey?: string;
  emailFrom?: string;
  teamEmail?: string;
}

export class LiveNotifier implements Notifier {
  constructor(
    private readonly c: NotifierConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  get channels(): string[] {
    return [
      ...(this.c.telegramToken && this.c.telegramTeamChatId ? ["telegram"] : []),
      ...(this.c.slackWebhookUrl ? ["slack"] : []),
      ...(this.c.resendApiKey && this.c.teamEmail ? ["email"] : []),
    ];
  }

  async notifyTeam(text: string): Promise<string[]> {
    const jobs: Array<[string, Promise<void>]> = [];
    if (this.c.telegramToken && this.c.telegramTeamChatId) jobs.push(["telegram", sendTelegram(this.c.telegramToken, this.c.telegramTeamChatId, text, this.fetchImpl)]);
    if (this.c.slackWebhookUrl) jobs.push(["slack", sendSlack(this.c.slackWebhookUrl, text, this.fetchImpl)]);
    if (this.c.resendApiKey && this.c.teamEmail && this.c.emailFrom) {
      jobs.push(["email", sendResend(this.c.resendApiKey, this.c.emailFrom, { to: this.c.teamEmail, subject: text.split("\n")[0] ?? "New lead", text }, this.fetchImpl)]);
    }
    const results = await Promise.allSettled(jobs.map(([, p]) => p));
    return results.flatMap((r, i) => (r.status === "rejected" ? [`${jobs[i]?.[0]}: ${String(r.reason)}`] : []));
  }

  async sendEmail(m: EmailMessage): Promise<void> {
    if (!this.c.resendApiKey || !this.c.emailFrom) return;
    await sendResend(this.c.resendApiKey, this.c.emailFrom, m, this.fetchImpl);
  }
}

/** Records everything instead of sending (local dev, tests, e2e). */
export class OutboxNotifier implements Notifier {
  readonly channels = ["outbox"];
  team: string[] = [];
  emails: EmailMessage[] = [];
  async notifyTeam(text: string): Promise<string[]> {
    this.team.push(text);
    return [];
  }
  async sendEmail(m: EmailMessage): Promise<void> {
    this.emails.push(m);
  }
  reset() {
    this.team = [];
    this.emails = [];
  }
}
