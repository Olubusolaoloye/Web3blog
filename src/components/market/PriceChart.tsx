import { lazy, Suspense, useEffect, useState } from "react";
import type { PricePoint } from "~/lib/market/types";
import { ChartSvg } from "./ChartSvg";

const Interactive = lazy(() => import("./PriceChartInteractive"));

/** SSR shows a static SVG; after hydration the interactive chart is lazy-loaded in its place (no layout shift). */
export function PriceChart({ points, currency, locale, label }: { points: readonly PricePoint[]; currency: string; locale: string; label: string }) {
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  const fallback = <ChartSvg points={points} label={label} />;
  return client ? (
    <Suspense fallback={fallback}>
      <Interactive points={points} currency={currency} locale={locale} />
    </Suspense>
  ) : (
    fallback
  );
}
