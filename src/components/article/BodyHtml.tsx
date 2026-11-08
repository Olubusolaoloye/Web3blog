import type { MouseEvent } from "react";
import { useNavigate } from "react-router";

/**
 * Shows server-rendered HTML (article bodies, the footer). Internal links still navigate client-side.
 */
export function BodyHtml({ html, as: Tag = "div", className }: { html: string; as?: "div" | "footer"; className?: string }) {
  const navigate = useNavigate();
  if (!html) return null;
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href || !href.startsWith("/") || href.startsWith("//") || a.target === "_blank") return;
    e.preventDefault();
    navigate(href);
  };
  // Click delegation only: the links inside stay focusable and keyboard-activated as normal anchors.
  return <Tag className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
