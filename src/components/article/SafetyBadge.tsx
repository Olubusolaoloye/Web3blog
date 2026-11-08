import { Link } from "react-router";
import { cn } from "~/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

const STYLES: Record<RiskLevel, { label: string; icon: string; className: string }> = {
  low: { label: "Low risk", icon: "✓", className: "border-up text-up" },
  medium: { label: "Medium risk", icon: "!", className: "border-warning text-warning" },
  high: { label: "High risk", icon: "✕", className: "border-alert text-alert" },
  unknown: { label: "Risk unknown", icon: "?", className: "border-border text-muted" },
};

interface Props {
  level: RiskLevel;
  /** Link to the full scan report. */
  href?: string;
  label?: string;
}

/** Risk level with icon + colour; links to the full scan (CLAUDE.md §4). */
export function SafetyBadge({ level, href, label }: Props) {
  const s = STYLES[level];
  const content = (
    <>
      <span aria-hidden className="grid size-5 place-items-center rounded-full border border-current text-[0.7rem] font-bold">
        {s.icon}
      </span>
      <span className="whitespace-nowrap font-semibold">{s.label}</span>
      {label ? <span className="text-muted">· {label}</span> : null}
    </>
  );
  const className = cn(
    "inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-2xl border bg-surface px-3 py-1 text-sm",
    s.className,
  );
  return href ? (
    <Link to={href} className={cn(className, "hover:bg-surface-2")} data-risk={level}>
      {content}
    </Link>
  ) : (
    <span className={className} data-risk={level}>
      {content}
    </span>
  );
}
