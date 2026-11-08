import { useState } from "react";

interface Props {
  url: string;
  title: string;
  bottomLine: readonly string[];
}

export function whatsappShareText(title: string, bottomLine: readonly string[], url: string): string {
  return [title, "", ...bottomLine.map((b) => `• ${b}`), "", url].join("\n");
}

/** WhatsApp first (CLAUDE.md §7.2). Plain links, so they work without JS; copy-link needs JS. */
export function ShareButtons({ url, title, bottomLine }: Props) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(whatsappShareText(title, bottomLine, url))}` },
    { label: "X", href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}` },
  ];
  const btn = "inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-sm font-medium hover:border-signal-ink";

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-buttons">
      <span className="text-sm text-muted">Share:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener" className={btn} aria-label={`Share on ${l.label}`}>
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copy this link", url);
          }
        }}
      >
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
