import { Link } from "react-router";
import { StaticPage } from "~/components/layout/StaticPage";
import { site } from "~/config/site";
import { staticMeta } from "~/lib/seo/static-meta";

export const meta = () => staticMeta("Contact", "/contact", `How to reach the ${site.name} newsroom, report an error or work with us.`);

export default function Contact() {
  return (
    <StaticPage title="Contact" path="/contact" intro="We read everything. Tell us what we got wrong, what we missed, or what you need.">
      <h2>News tips and corrections</h2>
      <p>
        Email <a href={`mailto:${site.contactEmail}?subject=Tip`}>{site.contactEmail}</a>. For corrections, include the story link and
        what needs fixing. See our <Link to="/corrections">corrections page</Link>.
      </p>
      <h2>Report a scam</h2>
      <p>
        Send the website, wallet address or Telegram handle to{" "}
        <a href={`mailto:${site.contactEmail}?subject=Scam%20report`}>{site.contactEmail}</a>. The Safety Desk reviews every report.
      </p>
      <h2>Partners and advertising</h2>
      <p>
        See <Link to="/partners">partner packages</Link>. We never accept gambling, betting or loan advertising.
      </p>
      <h2>Community</h2>
      <p>
        Join us on <a href={site.socials.telegram} rel="noopener">Telegram</a> or{" "}
        <a href={site.socials.whatsapp} rel="noopener">WhatsApp</a>.
      </p>
    </StaticPage>
  );
}
