import { Link } from "react-router";
import { footerNav } from "~/config/footer";
import { site } from "~/config/site";
import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <div className="mt-16 border-t border-border bg-surface">
      <div className="container-content grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-1">
          <Logo />
          <p className="text-sm text-muted">{site.tagline}</p>
          <ul className="flex gap-3 text-sm">
            <li><a href={site.socials.telegram} rel="noopener" className="hover:text-signal-ink">Telegram</a></li>
            <li><a href={site.socials.whatsapp} rel="noopener" className="hover:text-signal-ink">WhatsApp</a></li>
            <li><a href={site.socials.x} rel="noopener" className="hover:text-signal-ink">X</a></li>
          </ul>
        </div>
        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="mb-3 text-sm font-semibold">{group.heading}</h2>
            <ul className="space-y-2 text-sm text-muted">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="container-content py-4 text-xs text-muted">
          © {year} {site.name}. Not financial advice. We never publish gambling, betting or loan content.
        </p>
      </div>
    </div>
  );
}
