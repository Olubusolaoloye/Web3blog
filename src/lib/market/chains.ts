/** Chains the Safety scanner supports (CLAUDE.md §7.5), keyed by our id. */
export const scannerChains = [
  { id: "ethereum", name: "Ethereum", coingecko: "ethereum" },
  { id: "bsc", name: "BNB Smart Chain", coingecko: "binance-smart-chain" },
  { id: "base", name: "Base", coingecko: "base" },
  { id: "arbitrum", name: "Arbitrum", coingecko: "arbitrum-one" },
  { id: "polygon", name: "Polygon", coingecko: "polygon-pos" },
  { id: "solana", name: "Solana", coingecko: "solana" },
] as const;

/** First contract on a scanner-supported chain, from CoinGecko's `platforms` map. */
export function scannableContract(platforms: Readonly<Record<string, string>>): { chain: string; address: string } | undefined {
  for (const c of scannerChains) {
    const address = platforms[c.coingecko];
    if (address) return { chain: c.id, address };
  }
  return undefined;
}
