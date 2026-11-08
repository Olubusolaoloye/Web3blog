import { sparklinePath, trend } from "~/lib/market/sparkline";
import { cn } from "~/lib/utils";

interface Props {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
  label?: string;
}

/** Server-rendered SVG sparkline; colour follows the trend. */
export function Sparkline({ values, width = 96, height = 28, className, label }: Props) {
  const d = sparklinePath(values, width, height, 2);
  if (!d) return null;
  const t = trend(values);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(t === "up" ? "text-up" : t === "down" ? "text-down" : "text-muted", className)}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
