import { Link } from "react-router";

export function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="container-content py-16">
      <p className="tabular text-sm text-signal-ink">404</p>
      <h1 className="mt-1 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">{message}</p>
      <ul className="mt-6 flex flex-wrap gap-4 text-sm">
        <li><Link className="underline hover:text-signal-ink" to="/">Home</Link></li>
        <li><Link className="underline hover:text-signal-ink" to="/news">Latest news</Link></li>
        <li><Link className="underline hover:text-signal-ink" to="/safety">Safety Desk</Link></li>
      </ul>
    </div>
  );
}
