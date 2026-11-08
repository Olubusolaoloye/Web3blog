import { useEffect, useState } from "react";
import type { CountryCode } from "~/config/countries";
import { NewsletterBox } from "./NewsletterBox";

const KEY = "hl_sticky_dismissed";
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * `sticky-footer` NewsletterBox variant: a dismissible bar fixed to the bottom of the screen. Shown after the reader
 * scrolls a little, hidden for 7 days once dismissed. Used on market and hub pages (not articles, which already
 * have two capture boxes).
 */
export function StickyNewsletter({ country }: { country: CountryCode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (Date.now() - Number(localStorage.getItem(KEY) ?? 0) < WEEK) return;
    } catch {
      return;
    }
    const onScroll = () => {
      if (window.scrollY > 600) {
        setVisible(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 p-2 shadow-2xl backdrop-blur" data-testid="sticky-newsletter">
      <div className="relative mx-auto max-w-[var(--container-content)]">
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            try {
              localStorage.setItem(KEY, String(Date.now()));
            } catch {
              // ignore
            }
          }}
          aria-label="Dismiss newsletter sign-up"
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full text-xl text-muted hover:text-text"
        >
          ×
        </button>
        <NewsletterBox variant="sticky-footer" country={country} heading="Prices and scam alerts, free" />
      </div>
    </div>
  );
}
