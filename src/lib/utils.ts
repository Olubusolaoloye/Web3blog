import { clsx, type ClassValue } from "clsx";

/**
 * Class name joiner. Plain clsx (no tailwind-merge) to keep the client bundle within the article JS budget
 * (CLAUDE.md §9). Don't pass conflicting utilities; use variants instead.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
