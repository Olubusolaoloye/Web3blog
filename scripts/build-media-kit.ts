/**
 * Builds public/media-kit.pdf from the partners content (packages + partner settings) with Playwright's Chromium.
 * Run: pnpm media-kit   (Node 22.18+ type stripping). With Sanity configured, upload the PDF to the
 * "Partners hub settings" document instead; the site prefers the CMS file.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { site } from "../src/config/site.ts";
import { seedPackages, seedPartnerSettings } from "../src/lib/content/fixtures/seed.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const s = seedPartnerSettings;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0b1020; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 26pt; margin: 0 0 4mm; } h2 { font-size: 15pt; margin: 9mm 0 3mm; border-bottom: 2px solid #c6f432; padding-bottom: 1mm; }
  .brand { font-weight: 700; font-size: 14pt; } .muted { color: #4a5470; }
  .stats { display: flex; gap: 6mm; } .stat { border: 1px solid #d5dae5; border-radius: 3mm; padding: 4mm; flex: 1; }
  .stat b { display: block; font-size: 16pt; } table { width: 100%; border-collapse: collapse; }
  td, th { text-align: left; padding: 2mm; border-bottom: 1px solid #d5dae5; vertical-align: top; } .price { white-space: nowrap; font-weight: 700; }
  .note { background: #fff7e0; border: 1px solid #ffc24b; padding: 3mm; border-radius: 2mm; margin-top: 4mm; font-size: 9.5pt; }
</style></head><body>
  <p class="brand">${esc(site.name)} · <span class="muted">${esc(site.tagline)}</span></p>
  <h1>${esc(s.headline)}</h1>
  <p>${esc(s.intro)}</p>
  <h2>Audience</h2>
  <div class="stats">${s.audienceStats.map((x) => `<div class="stat"><span class="muted">${esc(x.label)}</span><b>${esc(x.value)}</b><span class="muted">${esc(x.note ?? "")}</span></div>`).join("")}</div>
  <p class="muted">Markets: Nigeria, Kenya, South Africa, Ghana.</p>
  <h2>Formats</h2>
  <ul>${s.formats.map((f) => `<li><b>${esc(f.name)}</b>: ${esc(f.description)}</li>`).join("")}</ul>
  <h2>Packages</h2>
  <table><tr><th>Package</th><th>What you get</th><th>Price</th></tr>
  ${[...seedPackages].sort((a, b) => a.order - b.order).map((p) => `<tr><td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.summary)}</span></td><td>${p.deliverables.map(esc).join("<br>")}</td><td class="price">${"priceNote" in p && p.priceNote === "from" ? "from " : ""}${usd(p.priceUsd)}${"priceNote" in p && p.priceNote && p.priceNote !== "from" ? ` ${esc(p.priceNote)}` : ""}</td></tr>`).join("")}
  </table>
  <h2>Our rules</h2>
  <p>Every paid placement is labelled and lives in our press section, with <i>sponsored nofollow</i> links. Advertisers never influence our news. We don't accept gambling, betting or loan advertisers.</p>
  <p>Book online: <b>${esc(site.url)}/partners</b> · ${esc(site.contactEmail)}</p>
  <p class="note">Development copy: audience figures and prices are placeholders until set in the CMS.</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
const pdf = await page.pdf({ format: "A4", printBackground: true });
await browser.close();
const out = resolve(import.meta.dirname, "../public/media-kit.pdf");
writeFileSync(out, pdf);
console.log(`Wrote ${out} (${(pdf.length / 1024).toFixed(0)} KB)`);
