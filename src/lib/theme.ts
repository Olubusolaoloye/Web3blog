export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export function parseTheme(value: unknown): Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value)
    ? (value as Theme)
    : "system";
}

/** Toggle order used by the header button. */
export function nextTheme(current: Theme): Theme {
  const i = themes.indexOf(current);
  return themes[(i + 1) % themes.length] as Theme;
}
