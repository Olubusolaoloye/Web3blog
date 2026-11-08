import { launchedCountries } from "~/config/countries";
import { site } from "~/config/site";
import { getFlag, track } from "~/lib/analytics/client";

/**
 * Exit-intent / scroll-depth sign-up modal (CLAUDE.md §8): desktop only, at most once per 7 days, behind the
 * `exitIntent` flag (PostHog, falling back to config/flags.ts). Lazy-loaded and built with plain DOM APIs, so it
 * pulls no extra React code into page bundles.
 */
export const SEEN_KEY = "hl_exit_seen";
export const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";

export function shownRecently(now = Date.now()): boolean {
  try {
    const last = Number(localStorage.getItem(SEEN_KEY));
    return Boolean(last) && now - last < COOLDOWN_MS;
  } catch {
    return true; // storage blocked: don't risk showing it on every page
  }
}

export async function arm(countryCode: string): Promise<(() => void) | undefined> {
  if (!window.matchMedia(DESKTOP_QUERY).matches || shownRecently()) return undefined;
  if (!(await getFlag("exitIntent"))) return undefined;

  let fired = false;
  const trigger = () => {
    if (fired) return;
    fired = true;
    cleanup();
    show(countryCode);
  };
  const onMouseOut = (e: MouseEvent) => {
    if (!e.relatedTarget && e.clientY <= 0) trigger();
  };
  const onScroll = () => {
    const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    if (depth >= 0.6) trigger();
  };
  const cleanup = () => {
    document.removeEventListener("mouseout", onMouseOut);
    window.removeEventListener("scroll", onScroll);
  };
  document.addEventListener("mouseout", onMouseOut);
  window.addEventListener("scroll", onScroll, { passive: true });
  return cleanup;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

export function show(countryCode: string): HTMLElement {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  const source = `exit-intent:${location.pathname}`;
  const overlay = el("div", { class: "fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" });
  const dialog = el("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "exit-title",
    class: "w-full max-w-md rounded-brand border border-border bg-surface p-6 shadow-xl",
    "data-testid": "exit-intent",
  });
  const head = el("div", { class: "flex items-start justify-between gap-4" });
  head.append(
    el("h2", { id: "exit-title", class: "text-xl font-semibold" }, "Before you go: crypto, clearly, in your inbox"),
    el("button", { type: "button", "aria-label": "Close", class: "text-2xl leading-none text-muted hover:text-text", "data-close": "" }, "×"),
  );

  const form = el("form", { class: "mt-4 grid gap-3" });
  const email = el("input", { id: "exit-email", name: "email", type: "email", required: "", placeholder: "you@example.com", class: "h-11 rounded-brand border border-border bg-bg px-3" });
  const country = el("select", { id: "exit-country", name: "country", class: "h-11 rounded-brand border border-border bg-bg px-3" });
  for (const c of launchedCountries) country.append(new Option(`${c.flag} ${c.name}`, c.code, false, c.code === countryCode));
  const submit = el("button", { type: "submit", class: "h-11 rounded-brand bg-signal font-semibold text-on-signal" }, "Subscribe");
  const error = el("p", { role: "alert", class: "text-sm text-alert" });
  const consent = el("p", { class: "text-xs text-muted" }, "Unsubscribe any time. See our ");
  consent.append(el("a", { href: "/privacy", class: "underline" }, "privacy policy"), ".");
  form.append(
    el("p", { class: "text-sm text-muted" }, "Local prices, scam alerts and the news that matters. Free, every weekday."),
    el("input", { type: "hidden", name: "source", value: source }),
    el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", class: "hidden", "aria-hidden": "true" }),
    el("label", { for: "exit-email", class: "sr-only" }, "Email address"),
    email,
    el("label", { for: "exit-country", class: "sr-only" }, "Country"),
    country,
    submit,
    error,
    consent,
  );
  dialog.append(head, form);
  overlay.append(dialog);
  document.body.append(overlay);
  email.focus();

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || (e.target as HTMLElement).hasAttribute("data-close")) close();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submit.disabled = true;
    submit.textContent = "Signing up…";
    const res = await fetch("/api/subscribe", { method: "POST", body: new FormData(form) }).catch(() => undefined);
    if (res?.ok) {
      track("subscribe", { source });
      const done = el("p", { role: "status", class: "mt-4" }, "You're on the list. Join us on ");
      done.append(el("a", { href: site.socials.whatsapp, class: "underline", rel: "noopener" }, "WhatsApp"), " or ");
      done.append(el("a", { href: site.socials.telegram, class: "underline", rel: "noopener" }, "Telegram"), " too.");
      form.replaceWith(done);
    } else {
      submit.disabled = false;
      submit.textContent = "Subscribe";
      error.textContent = res?.status === 429 ? "Too many attempts. Please try again later." : "Check your email and try again.";
    }
  });
  track("exit_intent_shown", { path: location.pathname });
  return overlay;
}
