import { Link } from "react-router";
import { StaticPage } from "~/components/layout/StaticPage";
import { site } from "~/config/site";
import { staticMeta } from "~/lib/seo/static-meta";

// Draft terms written for development. Must be reviewed by a lawyer before launch.
export const meta = () => staticMeta("Terms of use", "/terms", `The terms for using ${site.name}.`);

export default function Terms() {
  return (
    <StaticPage title="Terms of use" path="/terms" updated="8 November 2026">
      <p>By using {site.name} you agree to these terms.</p>
      <h2>Information, not advice</h2>
      <p>Everything on this site is for information only and is not financial, investment, legal or tax advice. See our <Link to="/disclaimer">disclaimer</Link>.</p>
      <h2>Tools and data</h2>
      <p>Prices, P2P rates, risk scans and calculators are provided as they are, may be delayed or wrong, and can miss risks. Check important information yourself before acting on it.</p>
      <h2>Your account</h2>
      <p>Keep your login secure. Don't misuse the site, scrape it at scale, or try to break our security.</p>
      <h2>Content</h2>
      <p>Our articles and data are protected by copyright. You may share links and short quotes with credit.</p>
      <h2>Changes</h2>
      <p>We may update these terms. We will change the date above when we do.</p>
    </StaticPage>
  );
}
