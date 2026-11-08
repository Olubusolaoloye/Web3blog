import { Link } from "react-router";
import { StaticPage } from "~/components/layout/StaticPage";
import { site } from "~/config/site";
import { staticMeta } from "~/lib/seo/static-meta";

// Draft policy written for development. Must be reviewed by a lawyer (NDPA, Kenya DPA, POPIA, Ghana DPA) before launch.
export const meta = () => staticMeta("Privacy policy", "/privacy", `What data ${site.name} collects, why, and your choices.`);

export default function Privacy() {
  return (
    <StaticPage title="Privacy policy" path="/privacy" updated="8 November 2026">
      <h2>What we collect</h2>
      <ul>
        <li><strong>Newsletter sign-ups:</strong> your email, country and, if you choose, experience level, plus which page you signed up on.</li>
        <li><strong>Accounts:</strong> your email, profile choices, watchlist and price alerts.</li>
        <li><strong>Cookies:</strong> <code>hl_country</code> (your country and currency), <code>hl_theme</code> (light or dark mode) and <code>hl_utm</code> (which campaign brought you here).</li>
        <li><strong>Analytics:</strong> pages viewed and actions taken, used in aggregate to improve the site.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To send the newsletters and alerts you asked for, to show prices in your currency, and to understand which content is useful. We do not sell your personal data.</p>
      <h2>Who we share it with</h2>
      <p>Service providers that run parts of the site for us (email delivery, newsletter platform, database hosting, analytics), under contracts that limit their use of your data.</p>
      <h2>Your choices</h2>
      <p>
        Unsubscribe from any email with one click. You can ask us to see, correct or delete your data by emailing{" "}
        <a href={`mailto:${site.contactEmail}?subject=Privacy%20request`}>{site.contactEmail}</a>. Account holders can delete their account from the account page.
      </p>
      <p>See also our <Link to="/terms">terms</Link>.</p>
    </StaticPage>
  );
}
