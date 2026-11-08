export interface CoinQuote {
  /** CoinGecko id, e.g. "bitcoin" */
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
}

export interface LocalQuote extends CoinQuote {
  currency: string;
  price: number;
}
