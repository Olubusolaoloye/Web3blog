// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/analytics/client", () => ({ getFlag: vi.fn(async () => true), track: vi.fn() }));

import { getFlag } from "~/lib/analytics/client";
import { arm, COOLDOWN_MS, SEEN_KEY, show, shownRecently } from "~/components/capture/exit-intent";

function setDesktop(desktop: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: desktop }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("exit-intent modal", () => {
  it("shows at most once per 7 days", () => {
    const now = Date.now();
    expect(shownRecently(now)).toBe(false);
    localStorage.setItem(SEEN_KEY, String(now - 1000));
    expect(shownRecently(now)).toBe(true);
    expect(shownRecently(now + COOLDOWN_MS)).toBe(false);
  });

  it("is desktop only and behind the exitIntent flag", async () => {
    setDesktop(false);
    expect(await arm("ng")).toBeUndefined();
    setDesktop(true);
    vi.mocked(getFlag).mockResolvedValueOnce(false);
    expect(await arm("ng")).toBeUndefined();
    vi.mocked(getFlag).mockResolvedValueOnce(true);
    const cleanup = await arm("ng");
    expect(cleanup).toBeTypeOf("function");
    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0, relatedTarget: null }));
    expect(document.querySelector('[data-testid="exit-intent"]')).not.toBeNull();
    expect(shownRecently()).toBe(true);
  });

  it("subscribes with source exit-intent:<path> and shows the community CTA", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ok: true }));
    show("ke");
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect((dialog.querySelector("select") as HTMLSelectElement).value).toBe("ke");
    (dialog.querySelector('input[name="email"]') as HTMLInputElement).value = "a@b.co";
    (dialog.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(dialog.querySelector('[role="status"]')).not.toBeNull());
    const body = (fetchSpy.mock.calls[0]?.[1] as RequestInit).body as FormData;
    expect(body.get("source")).toBe(`exit-intent:${location.pathname}`);
    expect(dialog.textContent).toContain("WhatsApp");
  });

  it("closes on Escape", () => {
    show("ng");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
