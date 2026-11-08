interface Props {
  kind: "sponsored" | "pressRelease";
  sponsorName: string;
  disclosureText?: string;
}

/** Banner on every /press item (CLAUDE.md §7.11). */
export function SponsoredLabel({ kind, sponsorName, disclosureText }: Props) {
  const label = kind === "pressRelease" ? "Press Release" : "Sponsored";
  return (
    <div role="note" className="rounded-brand border border-warning bg-surface px-4 py-3" data-testid="sponsored-label">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-warning">{label}</p>
      <p className="mt-1 text-sm text-muted">
        {disclosureText ??
          `This content was paid for by ${sponsorName}. It was not written by our newsroom and is not investment advice.`}
      </p>
    </div>
  );
}
