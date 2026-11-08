import { Link } from "react-router";
import type { Route } from "./+types/_site.about";
import { StaticPage } from "~/components/layout/StaticPage";
import { launchedCountries } from "~/config/countries";
import { site } from "~/config/site";
import { getContentSource } from "~/lib/content/source.server";
import { staticMeta } from "~/lib/seo/static-meta";

export async function loader() {
  return { authors: await getContentSource().listAuthors() };
}

export const meta = () =>
  staticMeta(`About ${site.name}`, "/about", `${site.name} is a crypto news and tools platform for Africa and emerging markets.`);

export default function About({ loaderData }: Route.ComponentProps) {
  return (
    <StaticPage title={`About ${site.name}`} path="/about" intro={site.tagline}>
      <p>
        {site.name} covers crypto for people in emerging markets: the prices you actually pay, in your own currency, the
        rules in your country, and the scams aimed at your community. We launched in{" "}
        {launchedCountries.map((c) => c.name).join(", ").replace(/, ([^,]*)$/, " and $1")}.
      </p>
      <h2>What we promise</h2>
      <ul>
        <li>Every news story is sourced and starts with The Bottom Line.</li>
        <li>Paid content is always labelled and kept in a separate <Link to="/press">press section</Link>.</li>
        <li>We never publish gambling, betting or loan content or ads.</li>
        <li>We correct mistakes in public on our <Link to="/corrections">corrections page</Link>.</li>
      </ul>
      <p>
        Read our <Link to="/standards">editorial standards</Link> for the details.
      </p>
      <h2>The team</h2>
      <ul>
        {loaderData.authors.map((a) => (
          <li key={a.slug}>
            <Link to={`/authors/${a.slug}`}>{a.name}</Link>, {a.role}
          </li>
        ))}
      </ul>
      <h2>Work with us</h2>
      <p>
        Businesses can reach our readers through clearly labelled partner formats. See{" "}
        <Link to="/partners">partners and advertising</Link> or <Link to="/contact">contact us</Link>.
      </p>
    </StaticPage>
  );
}
