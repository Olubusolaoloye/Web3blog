/** Newsletter platform adapter (CLAUDE.md §2: beehiiv). */
export interface NewsletterSubscribeInput {
  email: string;
  country: string;
  source: string;
  utm: Record<string, string>;
  interests: string[];
}

export interface NewsletterProvider {
  readonly name: string;
  subscribe(input: NewsletterSubscribeInput): Promise<{ id: string } | null>;
}

/** beehiiv v2: POST /publications/{publicationId}/subscriptions */
export class BeehiivProvider implements NewsletterProvider {
  readonly name = "beehiiv";
  constructor(
    private readonly publicationId: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async subscribe(input: NewsletterSubscribeInput): Promise<{ id: string }> {
    const res = await this.fetchImpl(`https://api.beehiiv.com/v2/publications/${encodeURIComponent(this.publicationId)}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: input.utm.utm_source ?? "website",
        utm_medium: input.utm.utm_medium ?? "organic",
        utm_campaign: input.utm.utm_campaign ?? input.source.split(":")[0],
        referring_site: input.source,
        custom_fields: [
          { name: "country", value: input.country },
          { name: "interests", value: input.interests.join(",") },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`beehiiv ${res.status}`);
    const body = (await res.json()) as { data?: { id?: string } };
    if (!body.data?.id) throw new Error("beehiiv: no subscription id");
    return { id: body.data.id };
  }
}

export class NoNewsletterProvider implements NewsletterProvider {
  readonly name = "none";
  async subscribe() {
    return null;
  }
}
