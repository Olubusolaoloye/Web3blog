/**
 * CDN cache purging behind an adapter, so hosting can change without touching the webhook.
 * Netlify: POST /api/v1/purge with cache tags (responses carry `Netlify-Cache-Tag`).
 */
export interface CachePurger {
  readonly name: string;
  purgeTags(tags: readonly string[]): Promise<void>;
}

export class NetlifyPurger implements CachePurger {
  readonly name = "netlify";
  constructor(
    private readonly siteId: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async purgeTags(tags: readonly string[]): Promise<void> {
    const res = await this.fetchImpl("https://api.netlify.com/api/v1/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ site_id: this.siteId, cache_tags: tags }),
    });
    if (!res.ok) throw new Error(`Netlify purge failed: ${res.status}`);
  }
}

export class NoopPurger implements CachePurger {
  readonly name = "noop";
  readonly purged: string[][] = [];
  async purgeTags(tags: readonly string[]): Promise<void> {
    this.purged.push([...tags]);
  }
}

export function getCachePurger(): CachePurger {
  const siteId = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_PURGE_API_TOKEN;
  return siteId && token ? new NetlifyPurger(siteId, token) : new NoopPurger();
}
