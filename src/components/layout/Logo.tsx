import { Link } from "react-router";
import { site } from "~/config/site";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight" aria-label={`${site.name} home`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6">
        <rect width="24" height="24" rx="6" fill="var(--signal)" />
        <path d="M7 6v12M17 6v12M5 10h14M5 14h14" stroke="var(--on-signal)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span>{site.name}</span>
    </Link>
  );
}
