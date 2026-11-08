import { AreaSeries, ColorType, createChart, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { PricePoint } from "~/lib/market/types";

/** lightweight-charts area chart. Loaded lazily, only on market pages (CLAUDE.md §9). */
export default function PriceChartInteractive({ points, currency, locale }: { points: readonly PricePoint[]; currency: string; locale: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || points.length < 2) return;
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const up = (points[points.length - 1]?.[1] ?? 0) >= (points[0]?.[1] ?? 0);
    const line = color(up ? "--up" : "--down");
    const fmt = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: (points[0]?.[1] ?? 0) < 10 ? 4 : 2 });

    const chart = createChart(el, {
      height: 240,
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: color("--text-muted"), attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: color("--border") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      localization: { priceFormatter: (p: number) => fmt.format(p) },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, { lineColor: line, topColor: `${line}55`, bottomColor: `${line}00`, lineWidth: 2 });
    series.setData(points.map(([t, v]) => ({ time: Math.floor(t / 1000) as UTCTimestamp, value: v })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points, currency, locale]);

  return <div ref={ref} className="h-60 w-full" data-testid="price-chart" />;
}
