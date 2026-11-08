/** Shown wherever market data is sample data (no CoinGecko key), so nobody mistakes it for live prices. */
export function SampleDataNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="note" className="rounded-brand border border-warning bg-surface px-3 py-2 text-sm" data-testid="sample-data-notice">
      <strong className="text-warning">Sample data.</strong> These prices are placeholders for development. Live prices appear when the
      CoinGecko API key is configured.
    </p>
  );
}
