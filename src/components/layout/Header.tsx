import { NavLink } from "react-router";
import type { CountryConfig } from "~/config/countries";
import { site } from "~/config/site";
import type { Theme } from "~/lib/theme";
import { cn } from "~/lib/utils";
import { CountrySwitcher } from "./CountrySwitcher";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  country: CountryConfig;
  theme: Theme;
}

export function Header({ country, theme }: Props) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="container-content flex h-14 items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <CountrySwitcher current={country} />
          <ThemeToggle theme={theme} />
        </div>
      </div>
      <nav aria-label="Main" className="container-content">
        <ul className="-mx-1 flex gap-1 overflow-x-auto pb-2 text-sm [scrollbar-width:none]">
          {site.nav.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href === "/local/ng" ? `/local/${country.code}` : item.href}
                className={({ isActive }) =>
                  cn(
                    "block whitespace-nowrap rounded-full px-3 py-1.5 font-medium hover:text-text",
                    isActive ? "bg-surface-2 text-text" : "text-muted",
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
