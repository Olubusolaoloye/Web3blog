import { useFetcher, useLocation } from "react-router";
import { nextTheme, parseTheme, type Theme } from "~/lib/theme";

const LABEL: Record<Theme, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };
const ICON: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };

/** Cycles system → light → dark. Saved in the hl_theme cookie so SSR renders the right theme (no flash). */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const fetcher = useFetcher();
  const location = useLocation();
  const optimistic = fetcher.formData ? parseTheme(fetcher.formData.get("theme")) : theme;
  const next = nextTheme(optimistic);

  return (
    <fetcher.Form
      method="post"
      action="/api/theme"
      onSubmit={() => {
        document.documentElement.dataset.theme = next;
      }}
    >
      <input type="hidden" name="theme" value={next} />
      <input type="hidden" name="redirectTo" value={location.pathname + location.search} />
      <button
        type="submit"
        className="grid size-9 place-items-center rounded-brand border border-border bg-surface text-base"
        aria-label={`${LABEL[optimistic]}. Switch to ${LABEL[next].toLowerCase()}`}
        title={LABEL[optimistic]}
        data-testid="theme-toggle"
      >
        <span aria-hidden>{ICON[optimistic]}</span>
      </button>
    </fetcher.Form>
  );
}
