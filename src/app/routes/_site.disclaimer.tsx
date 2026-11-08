import { Link } from "react-router";
import { StaticPage } from "~/components/layout/StaticPage";
import { site } from "~/config/site";
import { staticMeta } from "~/lib/seo/static-meta";

export const meta = () => staticMeta("Disclaimer", "/disclaimer", "Not financial advice: what our content and tools can and can't do.");

export default function Disclaimer() {
  return (
    <StaticPage title="Disclaimer" path="/disclaimer">
      <p><strong>Not financial advice.</strong> {site.name} publishes news, education and tools. Nothing here is a recommendation to buy, sell or hold any asset.</p>
      <p>Crypto assets are volatile and can lose all their value. Only use money you can afford to lose, and speak to a licensed adviser about your situation.</p>
      <p>Automated checks, such as our token scanner, can miss risks. Tax calculators give estimates only.</p>
      <p>Sponsored content and press releases are paid for by third parties and are clearly labelled. See our <Link to="/standards#sponsored">sponsored content policy</Link>.</p>
    </StaticPage>
  );
}
