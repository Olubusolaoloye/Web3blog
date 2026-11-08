import { sparklinePath, trend } from "~/lib/market/sparkline";
import type { PricePoint } from "~/lib/market/types";

/** Server-rendered price chart (no JS). The interactive chart replaces it after hydration. */
export function ChartSvg({ points, label }: { points: readonly PricePoint[]; label: string }) {
  const values = points.map((p) => p[1]);
  const d = sparklinePath(values, 600, 240, 6);
  if (!d) return <p className="grid h-60 place-items-center text-sm text-muted">No chart data.</p>;
  const t = trend(values);
  return (
    <svg viewBox="0 0 600 240" className={`h-60 w-full ${t === "down" ? "text-down" : "text-up"}`} role="img" aria-label={label} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
