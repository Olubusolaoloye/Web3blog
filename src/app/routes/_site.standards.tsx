import { Link } from "react-router";
import { StaticPage } from "~/components/layout/StaticPage";
import { site } from "~/config/site";
import { staticMeta } from "~/lib/seo/static-meta";

export const meta = () =>
  staticMeta(
    "Editorial standards",
    "/standards",
    "How we report, source, correct and label content, including our sponsored content, no-gambling and AI policies.",
  );

export default function Standards() {
  return (
    <StaticPage
      title="Editorial standards"
      path="/standards"
      intro="How we decide what to publish, how we check it, and what we will never do."
      updated="8 November 2026"
    >
      <nav aria-label="On this page">
        <ul>
          <li><a href="#editorial">Editorial policy</a></li>
          <li><a href="#sources">Sourcing and fact-checking</a></li>
          <li><a href="#corrections">Corrections</a></li>
          <li><a href="#holdings">Staff holdings</a></li>
          <li><a href="#sponsored">Sponsored content policy</a></li>
          <li><a href="#no-gambling">No-gambling policy</a></li>
          <li><a href="#ai">AI use policy</a></li>
          <li><a href="#ethics">Ethics and independence</a></li>
        </ul>
      </nav>

      <h2 id="editorial">Editorial policy</h2>
      <p>
        We write for readers, not for token projects or exchanges. Every news story opens with The Bottom Line: up to three
        sentences that tell you what happened and why it matters. Each story has a named author and is reviewed by an editor
        before it goes live.
      </p>

      <h2 id="sources">Sourcing and fact-checking</h2>
      <p>
        Every news story lists its sources at the end. We prefer primary sources: regulators, court filings, company
        statements, on-chain data. When we rely on a single source, or cannot verify a claim, we say so in the story.
      </p>

      <h2 id="corrections">Corrections</h2>
      <p>
        When we get something wrong we fix it, note the change at the end of the story and list it on our{" "}
        <Link to="/corrections">corrections page</Link>. Report an error through our <Link to="/contact">contact page</Link>.
      </p>

      <h2 id="holdings">Staff holdings</h2>
      <p>
        Writers and editors disclose the crypto assets they hold on their author page. Staff may not trade an asset they
        are writing about from the day they start the story until 7 days after it is published, and may not accept tokens,
        airdrops or payment from projects we cover.
      </p>

      <h2 id="sponsored">Sponsored content policy</h2>
      <p>
        Paid articles and press releases appear only in our <Link to="/press">press section</Link>. They carry a clear
        &ldquo;Sponsored&rdquo; or &ldquo;Press Release&rdquo; label and a disclosure naming who paid. Their links are marked{" "}
        <code>rel=&quot;sponsored nofollow&quot;</code>. They never appear in our news lists, homepage editorial modules or related
        stories, and advertisers have no say over our journalism.
      </p>

      <h2 id="no-gambling">No-gambling policy</h2>
      <p>
        {site.name} does not publish or accept advertising for casinos, sports betting, crypto gambling, lotteries or loans.
        This applies to articles, press releases, directory listings and newsletters.
      </p>

      <h2 id="ai">AI use policy</h2>
      <p>
        We may use AI tools to help with research, transcription, translation and first drafts of data summaries. A named
        journalist is responsible for every published story, checks every fact against its source, and edits all text before
        publication. We do not publish AI-generated news without human review, and we do not use AI to create images that
        could be mistaken for real photographs of events.
      </p>

      <h2 id="ethics">Ethics and independence</h2>
      <p>
        Our newsroom is separate from our commercial team. Partners can buy labelled placements; they cannot buy coverage,
        reviews or ratings. Nothing we publish is financial advice.
      </p>
    </StaticPage>
  );
}
