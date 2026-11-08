// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { AuthorCard } from "~/components/article/AuthorCard";
import { BottomLine } from "~/components/article/BottomLine";
import { PortableBody } from "~/components/article/PortableBody";
import { SafetyBadge } from "~/components/article/SafetyBadge";
import { ShareButtons, whatsappShareText } from "~/components/article/ShareButtons";
import { NewsletterBox } from "~/components/capture/NewsletterBox";
import { SourceList } from "~/components/article/SourceList";
import { SponsoredLabel } from "~/components/article/SponsoredLabel";
import { PriceChip } from "~/components/market/PriceChip";
import { toLocalQuote } from "~/lib/market/convert";
import { FIXTURE_COINS, FIXTURE_FX } from "~/lib/market/fixtures";

const getQuote = (id: string, currency = "NGN") => toLocalQuote(FIXTURE_COINS.find((c) => c.id === id)!, currency, FIXTURE_FX);

afterEach(cleanup);

function withRouter(ui: ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }]);
  return render(<RouterProvider router={router} />);
}

describe("BottomLine", () => {
  it("shows the label and at most 3 bullets", () => {
    render(<BottomLine points={["one", "two", "three", "four"]} />);
    const box = screen.getByTestId("bottom-line");
    expect(within(box).getByText("The Bottom Line")).toBeInTheDocument();
    expect(within(box).getAllByRole("listitem")).toHaveLength(3);
  });
  it("renders nothing without points", () => {
    const { container } = render(<BottomLine points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SourceList", () => {
  const sources = [{ label: "CBN rates", url: "https://www.cbn.gov.ng/rates/" }];
  it("lists sources with hostnames", () => {
    render(<SourceList sources={sources} />);
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("cbn.gov.ng")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CBN rates" })).toHaveAttribute("rel", "noopener");
  });
  it("marks sponsored links sponsored nofollow", () => {
    render(<SourceList sources={sources} sponsored />);
    expect(screen.getByRole("link", { name: "CBN rates" }).getAttribute("rel")).toContain("sponsored nofollow");
  });
});

describe("AuthorCard", () => {
  it("shows name, role, expertise and a holdings disclosure link", async () => {
    withRouter(
      <AuthorCard author={{ name: "Amara Okafor", slug: "amara-okafor", role: "Markets Editor", expertise: ["Bitcoin"], holdingsDisclosure: "BTC" }} />,
    );
    expect(await screen.findByRole("link", { name: "Amara Okafor" })).toHaveAttribute("href", "/authors/amara-okafor");
    expect(screen.getByText("Markets Editor")).toBeInTheDocument();
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Holdings disclosure" })).toHaveAttribute("href", "/authors/amara-okafor#holdings");
  });
});

describe("SafetyBadge", () => {
  it("shows the level and links to the scan", async () => {
    withRouter(<SafetyBadge level="high" href="/safety/scanner?x=1" />);
    const link = await screen.findByRole("link");
    expect(link).toHaveTextContent("High risk");
    expect(link).toHaveAttribute("data-risk", "high");
  });
});

describe("SponsoredLabel", () => {
  it("labels press releases", () => {
    render(<SponsoredLabel kind="pressRelease" sponsorName="Acme" />);
    expect(screen.getByText("Press Release")).toBeInTheDocument();
    expect(screen.getByText(/paid for by Acme/)).toBeInTheDocument();
  });
});

describe("PriceChip", () => {
  it("shows symbol, local price and change", async () => {
    withRouter(<PriceChip quote={getQuote("bitcoin")} locale="en-NG" />);
    const chip = await screen.findByTestId("price-chip");
    expect(chip).toHaveTextContent("BTC₦98.3M▲2.1%");
    expect(chip).toHaveAttribute("href", "/markets/bitcoin");
    // 7-day mini chart, hidden until hover/focus/tap
    const chart = screen.getByTestId("price-chip-chart");
    expect(chart).toHaveClass("hidden");
    expect(chart.querySelector("path")?.getAttribute("d")).toMatch(/^M/);
  });
});

describe("PortableBody", () => {
  it("renders text and custom blocks; sponsored links get sponsored nofollow", async () => {
    const btc = getQuote("bitcoin");
    withRouter(
      <PortableBody
        sponsored
        locale="en-NG"
        quotes={{ bitcoin: btc }}
        value={[
          {
            _type: "block",
            _key: "a",
            style: "normal",
            markDefs: [{ _key: "l", _type: "link", href: "https://example.com" }],
            children: [
              { _type: "span", _key: "s1", text: "Hello ", marks: [] },
              { _type: "span", _key: "s2", text: "link", marks: ["l"] },
            ],
          },
          { _type: "priceChip", _key: "b", coinId: "bitcoin" },
          { _type: "callout", _key: "c", tone: "warning", body: "Careful" },
          { _type: "safetyBadge", _key: "d", level: "medium", chain: "base", contractAddress: "0xabc" },
        ]}
      />,
    );
    expect(await screen.findByText("Hello")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "link" }).getAttribute("rel")).toContain("sponsored nofollow");
    expect(screen.getByTestId("price-chip")).toBeInTheDocument();
    expect(screen.getByText("Careful")).toBeInTheDocument();
    expect(screen.getByText("Medium risk").closest("a")).toHaveAttribute("href", "/safety/scanner?chain=base&address=0xabc");
  });
});

describe("ShareButtons", () => {
  it("puts WhatsApp first and uses the Bottom Line as share text", async () => {
    withRouter(<ShareButtons url="https://site.test/news/a" title="Title" bottomLine={["One", "Two"]} />);
    const links = within(await screen.findByTestId("share-buttons")).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["WhatsApp", "X", "Telegram"]);
    const text = decodeURIComponent(links[0]!.getAttribute("href")!.split("text=")[1]!);
    expect(text).toBe(whatsappShareText("Title", ["One", "Two"], "https://site.test/news/a"));
    expect(text).toContain("• One\n• Two");
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });
});

describe("NewsletterBox", () => {
  it("asks for email + country only, records the source and links consent to privacy", async () => {
    withRouter(<NewsletterBox variant="end-of-article" country="ke" />);
    const box = await screen.findByTestId("newsletter-end-of-article");
    expect(within(box).getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(within(box).getByLabelText("Country")).toHaveValue("ke");
    expect(box.querySelector('input[name="source"]')).toHaveValue("end-of-article:/");
    const honeypot = box.querySelector('input[name="website"]');
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest("[aria-hidden]")).not.toBeNull();
    expect(within(box).getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(box.querySelector("form")).toHaveAttribute("action", "/api/subscribe");
  });
});

describe("AlertCTA", () => {
  it("is honest that alerts aren't live yet", async () => {
    const { AlertCTA } = await import("~/components/capture/AlertCTA");
    render(<AlertCTA symbol="BTC" currency="NGN" locale="en-NG" currentPrice={98_000_000} />);
    expect(screen.getByRole("heading", { name: /Alert me when BTC hits/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "WhatsApp" })).toBeNull(); // behind the whatsappAlerts flag
    screen.getByRole("spinbutton").focus();
    (screen.getByRole("spinbutton") as HTMLInputElement).value = "100000000";
    screen.getByRole("button", { name: "Set alert" }).click();
    expect(await screen.findByRole("status")).toHaveTextContent(/launching soon/);
  });
});

describe("Converter", () => {
  it("converts both ways", async () => {
    const { Converter } = await import("~/components/market/Converter");
    const { fireEvent } = await import("@testing-library/react");
    render(<Converter symbol="BTC" currency="KES" price={8_000_000} locale="en-KE" />);
    const [coin, fiat] = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.change(coin!, { target: { value: "0.5" } });
    expect(fiat!.value).toBe("4000000");
    fireEvent.change(fiat!, { target: { value: "80000" } });
    expect(coin!.value).toBe("0.01");
  });
});
