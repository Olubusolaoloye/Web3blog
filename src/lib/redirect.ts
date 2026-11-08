/** Only allow same-site relative redirects (prevents open redirects from form fields). */
export function safeRedirectPath(value: FormDataEntryValue | null, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
