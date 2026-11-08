interface Props {
  points: readonly string[];
}

/** "The Bottom Line": top of every article, max 3 bullets, lime left border (CLAUDE.md §4). */
export function BottomLine({ points }: Props) {
  const items = points.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <aside
      aria-labelledby="bottom-line-heading"
      className="rounded-r-brand border-l-4 border-signal bg-surface px-4 py-4 sm:px-6"
      data-testid="bottom-line"
    >
      <h2 id="bottom-line-heading" className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-signal-ink">
        The Bottom Line
      </h2>
      <ul className="space-y-2 text-base leading-relaxed">
        {items.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-signal" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
