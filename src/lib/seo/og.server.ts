import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
// Fonts are inlined into the server bundle (satori reads woff/ttf, not woff2), so no filesystem access is needed.
import groteskBold from "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?inline";
import interRegular from "@fontsource/inter/files/inter-latin-400-normal.woff?inline";
import { site } from "~/config/site";

export interface OgInput {
  /** Small label above the title, e.g. "News" or "Sponsored". */
  kicker?: string;
  title: string;
  /** First Bottom Line bullet (CLAUDE.md §9). */
  subtitle?: string;
  /** Visual tone for the kicker; sponsored content uses the warning colour. */
  tone?: "signal" | "warning";
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const dataUrlToBuffer = (url: string) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | undefined;

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function ogTree({ kicker, title, subtitle, tone = "signal" }: OgInput): Node {
  const accent = tone === "warning" ? "#FFC24B" : "#C6F432";
  // Explicit pixel sizes: satori doesn't include padding in a percentage-width box.
  return h(
    "div",
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: "flex",
      background: "#0B1020",
      color: "#F5F3EE",
      fontFamily: "Inter",
    },
    [
      h("div", { width: 16, height: OG_HEIGHT, background: accent, display: "flex" }),
      h(
        "div",
        {
          width: OG_WIDTH - 16 - 128,
          height: OG_HEIGHT - 112,
          marginLeft: 64,
          marginTop: 56,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
        [
          h(
            "div",
            { display: "flex", flexDirection: "column", gap: 24 },
            [
              kicker ? h("div", { fontSize: 28, color: accent, textTransform: "uppercase", letterSpacing: 2, fontFamily: "Space Grotesk" }, kicker) : null,
              h("div", { fontSize: title.length > 70 ? 54 : 64, lineHeight: 1.12, fontFamily: "Space Grotesk", fontWeight: 700 }, truncate(title, 120)),
              subtitle ? h("div", { fontSize: 30, lineHeight: 1.35, color: "#A7AEC2" }, truncate(subtitle, 160)) : null,
            ].filter(Boolean),
          ),
          h("div", { display: "flex", alignItems: "center" }, [
            h("div", { width: 44, height: 44, borderRadius: 10, background: "#C6F432", display: "flex", marginRight: 16 }),
            h("div", { fontSize: 34, fontFamily: "Space Grotesk", fontWeight: 700, marginRight: 20 }, site.name),
            h("div", { fontSize: 26, color: "#A7AEC2" }, site.tagline),
          ]),
        ],
      ),
    ],
  );
}

export async function renderOgPng(input: OgInput): Promise<Uint8Array> {
  fonts ??= [
    { name: "Space Grotesk", data: dataUrlToBuffer(groteskBold), weight: 700, style: "normal" },
    { name: "Inter", data: dataUrlToBuffer(interRegular), weight: 400, style: "normal" },
  ];
  // satori accepts React-element-shaped objects; we build them by hand to keep React out of this path.
  const svg = await satori(ogTree(input) as unknown as React.ReactNode, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
}
