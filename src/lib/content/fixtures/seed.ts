/**
 * Seed content: 10 articles, 3 authors, 4 countries, categories and tags (CLAUDE.md §10 Phase 1).
 *
 * These are Sanity-shaped documents. They are used two ways:
 *  1. Locally, by the fixture ContentSource when no Sanity project is configured.
 *  2. Exported to NDJSON by `pnpm --filter studio seed:export` for `sanity dataset import`.
 *
 * Authors are fictional placeholders and the articles are sample explainers written for development.
 * Replace them with real bylines and reporting before launch.
 *
 * `_placeholder` fields are fixture-only: the export script turns them into `_sanityAsset` uploads.
 */
import { pt, type SeedBodyNode } from "./pt.ts";

type Ref = { _type: "reference"; _ref: string; _key?: string };
const ref = (id: string, key?: string): Ref => (key ? { _type: "reference", _ref: id, _key: key } : { _type: "reference", _ref: id });
const refs = (ids: string[]) => ids.map((id, i) => ref(id, `r${i}`));
const slug = (current: string) => ({ _type: "slug" as const, current });

export interface SeedImage {
  _type: "image";
  alt: string;
  _placeholder: string;
  width: number;
  height: number;
}
const hero = (n: number, alt: string): SeedImage => ({
  _type: "image",
  alt,
  _placeholder: `/placeholders/hero-${n}.svg`,
  width: 1600,
  height: 900,
});
const avatar = (file: string, alt: string): SeedImage => ({
  _type: "image",
  alt,
  _placeholder: `/placeholders/${file}.svg`,
  width: 400,
  height: 400,
});

// ---------------------------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------------------------
export const seedAuthors = [
  {
    _id: "author.amara-okafor",
    _type: "author",
    name: "Amara Okafor",
    slug: slug("amara-okafor"),
    role: "Markets Editor, Lagos",
    bio: "Amara covers crypto markets, the naira and P2P trading across West Africa. Before joining the newsroom she reported on Nigerian capital markets.",
    expertise: ["Bitcoin markets", "FX and the naira", "P2P trading"],
    holdingsDisclosure: "Holds small amounts of BTC and USDT. Does not trade coins she writes about within 7 days of publication.",
    socials: { x: "https://x.com/example", linkedin: "https://www.linkedin.com/in/example" },
    photo: avatar("author-ao", "Portrait of Amara Okafor"),
  },
  {
    _id: "author.wanjiru-kamau",
    _type: "author",
    name: "Wanjiru Kamau",
    slug: slug("wanjiru-kamau"),
    role: "Regulation Reporter, Nairobi",
    bio: "Wanjiru follows crypto policy, licensing and tax across East and Southern Africa.",
    expertise: ["Regulation", "Tax", "Mobile money"],
    holdingsDisclosure: "Holds no crypto assets.",
    socials: { x: "https://x.com/example" },
    photo: avatar("author-wk", "Portrait of Wanjiru Kamau"),
  },
  {
    _id: "author.thabo-nkosi",
    _type: "author",
    name: "Thabo Nkosi",
    slug: slug("thabo-nkosi"),
    role: "Safety Desk Lead, Johannesburg",
    bio: "Thabo runs the Safety Desk, investigating scams, hacks and risky tokens, and maintains the scanner's plain-English explanations.",
    expertise: ["Scams and fraud", "Smart contract risk", "Wallet security"],
    holdingsDisclosure: "Holds ETH. Never holds tokens covered by the Safety Desk.",
    socials: { x: "https://x.com/example", telegram: "https://t.me/example" },
    photo: avatar("author-tn", "Portrait of Thabo Nkosi"),
  },
];

// ---------------------------------------------------------------------------------------------
// Countries (launch markets)
// ---------------------------------------------------------------------------------------------
export const seedCountries = [
  {
    _id: "country.ng",
    _type: "country",
    name: "Nigeria",
    code: "NG",
    currency: "NGN",
    flag: "🇳🇬",
    hubIntro: "Naira prices, P2P rates and the rules that matter for crypto users in Nigeria.",
    regulationStatus: pt(
      "ngr",
      "Digital assets are treated as securities and exchanges must register with the Securities and Exchange Commission (SEC). Check that a platform is registered before depositing funds.",
    ),
    regulationUpdatedAt: "2026-10-01",
    taxGuide: pt("ngt", "Gains on digital assets may be taxable. Keep records of every buy, sell and swap, and speak to a tax adviser for your situation."),
    howToBuy: pt("ngb", "Most people buy USDT or bitcoin with naira through a P2P marketplace or an SEC-registered exchange, paying by bank transfer. Compare the P2P rate with the official rate, trade only with verified merchants, and keep payment inside the platform's escrow."),
    recommendedExchanges: ["sample-exchange-ng", "sample-wallet"],
  },
  {
    _id: "country.ke",
    _type: "country",
    name: "Kenya",
    code: "KE",
    currency: "KES",
    flag: "🇰🇪",
    hubIntro: "Shilling prices, M-Pesa P2P rates and Kenya's virtual asset rules.",
    regulationStatus: pt(
      "ker",
      "Kenya has a licensing framework for virtual asset service providers. Use providers that disclose their licence status and local entity.",
    ),
    regulationUpdatedAt: "2026-10-01",
    taxGuide: pt("ket", "Kenya applies a digital asset tax on certain transfers. Platforms may deduct it automatically; keep your statements."),
    howToBuy: pt("keb", "Kenyans usually buy with M-Pesa through a P2P marketplace or a licensed exchange. Check the provider's licence status, confirm the merchant has a high completion rate, and never release payment outside the platform."),
    recommendedExchanges: ["sample-exchange-ke"],
  },
  {
    _id: "country.za",
    _type: "country",
    name: "South Africa",
    code: "ZA",
    currency: "ZAR",
    flag: "🇿🇦",
    hubIntro: "Rand prices, licensed providers and SARS tax basics for South African crypto users.",
    regulationStatus: pt(
      "zar",
      "Crypto assets are financial products and providers need a licence from the Financial Sector Conduct Authority (FSCA). Search the FSCA register before you sign up.",
    ),
    regulationUpdatedAt: "2026-10-01",
    taxGuide: pt("zat", "SARS treats crypto gains as income or capital gains depending on how you trade. Declare them on your return."),
    howToBuy: pt("zab", "In South Africa you can buy with rand via EFT on FSCA-licensed exchanges. Search the FSCA register for the provider's FSP number first, and remember SARS expects you to declare gains."),
    recommendedExchanges: [],
  },
  {
    _id: "country.gh",
    _type: "country",
    name: "Ghana",
    code: "GH",
    currency: "GHS",
    flag: "🇬🇭",
    hubIntro: "Cedi prices, P2P rates and the Bank of Ghana's approach to digital assets.",
    regulationStatus: pt(
      "ghr",
      "The Bank of Ghana and the SEC have published guidance on digital assets and are building a licensing regime. Treat unlicensed platforms with caution.",
    ),
    regulationUpdatedAt: "2026-10-01",
    taxGuide: pt("ght", "Tax treatment of crypto gains is still being clarified. Keep full records and get professional advice."),
    howToBuy: pt("ghb", "Ghanaians mostly buy with mobile money or bank transfer through P2P marketplaces. Until licensing is complete, prefer platforms that publish their company details and complaints process."),
    recommendedExchanges: [],
  },
];

// ---------------------------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------------------------
export const seedCategories = [
  { _id: "category.markets", _type: "category", title: "Markets", slug: slug("markets"), description: "Prices, flows and what moves them." },
  { _id: "category.regulation", _type: "category", title: "Regulation", slug: slug("regulation"), description: "Laws, licences and tax." },
  { _id: "category.safety", _type: "category", title: "Safety", slug: slug("safety"), description: "Scams, hacks and how to stay safe." },
  { _id: "category.explainers", _type: "category", title: "Explainers", slug: slug("explainers"), description: "Crypto, clearly explained." },
];

export const seedTags = [
  { _id: "tag.bitcoin", _type: "tag", title: "Bitcoin", slug: slug("bitcoin") },
  { _id: "tag.stablecoins", _type: "tag", title: "Stablecoins", slug: slug("stablecoins") },
  { _id: "tag.p2p", _type: "tag", title: "P2P", slug: slug("p2p") },
  { _id: "tag.scams", _type: "tag", title: "Scams", slug: slug("scams") },
  { _id: "tag.wallets", _type: "tag", title: "Wallets", slug: slug("wallets") },
  { _id: "tag.ethereum", _type: "tag", title: "Ethereum", slug: slug("ethereum") },
];

// ---------------------------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------------------------
interface SeedArticle {
  _id: string;
  _type: "article";
  title: string;
  slug: { _type: "slug"; current: string };
  type: "news" | "analysis" | "local" | "safety" | "learn" | "research";
  bottomLine: string[];
  body: SeedBodyNode[];
  sources: { _key: string; label: string; url: string }[];
  authors: Ref[];
  editor?: Ref;
  countries: Ref[];
  coins: string[];
  category: Ref;
  tags: Ref[];
  heroImage: SeedImage;
  publishedAt: string;
  updatedAt?: string;
  isBreaking: boolean;
  seo?: { title?: string; description?: string };
  faq?: { _key: string; question: string; answer: string }[];
}

const src = (items: [string, string][]) => items.map(([label, url], i) => ({ _key: `s${i}`, label, url }));

export const seedArticles: SeedArticle[] = [
  {
    _id: "article.bitcoin-dollar-naira-buyers",
    _type: "article",
    title: "Bitcoin rises as the dollar softens: what it means for naira buyers",
    slug: slug("bitcoin-dollar-naira-buyers"),
    type: "news",
    bottomLine: [
      "Bitcoin's dollar price is up on the day, but naira buyers also need to watch the FX rate.",
      "Local P2P prices often run above the official rate, so compare before you buy.",
      "Big daily moves cut both ways. Only buy what you can afford to hold through a drop.",
    ],
    body: pt(
      "a1",
      "Bitcoin traded higher today as the US dollar weakened against major currencies. For buyers in Nigeria, though, the dollar price is only half the story.",
      { _type: "priceChip", coinId: "bitcoin" },
      { h2: "Two prices, not one" },
      "Most Nigerians buy bitcoin with naira, through an exchange or a P2P marketplace. The naira price depends on the coin's dollar price and on the exchange rate between the naira and the dollar. When the naira weakens, local bitcoin prices can rise even on days when the dollar price is flat.",
      "That is why the P2P rate matters. Sellers on P2P platforms often quote a premium over the official rate, especially when dollars are scarce.",
      { h2: "What to check before you buy" },
      { bullets: ["Compare the naira price on at least two platforms.", "Check the platform is registered with the SEC.", "Factor in fees and the spread between buy and sell prices."] },
      "Short-term price moves are hard to predict. If you are new, consider buying small amounts regularly rather than all at once.",
    ),
    sources: src([
      ["Central Bank of Nigeria: exchange rates", "https://www.cbn.gov.ng/rates/"],
      ["Securities and Exchange Commission Nigeria", "https://sec.gov.ng/"],
    ]),
    authors: refs(["author.amara-okafor"]),
    editor: ref("author.wanjiru-kamau"),
    countries: refs(["country.ng"]),
    coins: ["bitcoin", "tether"],
    category: ref("category.markets"),
    tags: refs(["tag.bitcoin", "tag.p2p"]),
    heroImage: hero(1, "Abstract chart lines rising over a dark navy background"),
    publishedAt: "2026-11-08T07:30:00Z",
    updatedAt: "2026-11-08T09:10:00Z",
    isBreaking: true,
  },
  {
    _id: "article.kenya-vasp-framework-exchanges",
    _type: "article",
    title: "What Kenya's virtual asset licensing framework means for local exchanges",
    slug: slug("kenya-vasp-framework-exchanges"),
    type: "news",
    bottomLine: [
      "Kenya now has a licensing framework for virtual asset service providers.",
      "Exchanges serving Kenyans will need to show who regulates them and where they are based.",
      "Users should check a provider's licence status before depositing shillings.",
    ],
    body: pt(
      "a2",
      "Kenya has moved from informal tolerance of crypto to a formal licensing framework for virtual asset service providers, or VASPs. The change affects exchanges, wallet providers and brokers that serve Kenyan users.",
      { h2: "Who is covered" },
      "The framework covers businesses that exchange, hold or transfer virtual assets on behalf of customers. Providers are expected to register a local presence, meet capital and governance rules, and follow anti-money-laundering checks.",
      { h2: "What changes for users" },
      "For most users the visible change will be more identity checks and clearer disclosures. Platforms that cannot meet the rules may limit services in Kenya.",
      { _type: "callout", tone: "info", body: "Tip: a licensed provider should be able to tell you its local entity name and its regulator. If it can't, be careful." },
    ),
    sources: src([
      ["Capital Markets Authority Kenya", "https://www.cma.or.ke/"],
      ["Central Bank of Kenya", "https://www.centralbank.go.ke/"],
    ]),
    authors: refs(["author.wanjiru-kamau"]),
    editor: ref("author.amara-okafor"),
    countries: refs(["country.ke"]),
    coins: [],
    category: ref("category.regulation"),
    tags: refs(["tag.stablecoins"]),
    heroImage: hero(2, "Geometric shapes suggesting a city skyline at dusk"),
    publishedAt: "2026-11-07T12:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.fsca-licence-check-south-africa",
    _type: "article",
    title: "South Africa's FSCA licences: what to check before you sign up to a crypto platform",
    slug: slug("fsca-licence-check-south-africa"),
    type: "news",
    bottomLine: [
      "Crypto providers serving South Africans need an FSCA licence.",
      "You can search the FSCA register for free in a few minutes.",
      "An unlicensed platform gives you far less protection if something goes wrong.",
    ],
    body: pt(
      "a3",
      "South Africa classifies crypto assets as financial products, which means providers that give advice or arrange trades need a licence from the Financial Sector Conduct Authority (FSCA).",
      { h2: "How to check a licence" },
      { bullets: ["Find the provider's legal name and FSP number in its website footer.", "Search the number on the FSCA's public register.", "Confirm the licence covers crypto assets, not only other products."] },
      "If a platform's details don't match the register, or it avoids the question, treat that as a red flag.",
    ),
    sources: src([["Financial Sector Conduct Authority", "https://www.fsca.co.za/"]]),
    authors: refs(["author.wanjiru-kamau"]),
    countries: refs(["country.za"]),
    coins: [],
    category: ref("category.regulation"),
    tags: [],
    heroImage: hero(3, "Shield-like geometric shape in lime and navy"),
    publishedAt: "2026-11-06T09:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.ghana-digital-asset-approach",
    _type: "article",
    title: "Ghana sets out its approach to digital asset regulation",
    slug: slug("ghana-digital-asset-approach"),
    type: "news",
    bottomLine: [
      "Ghana's regulators are building a licensing regime for digital asset firms.",
      "Until it is in force, users carry more of the risk on unlicensed platforms.",
      "Keep records of your transactions now; tax rules are likely to follow.",
    ],
    body: pt(
      "a4",
      "Ghana's financial regulators have published guidance on how they intend to supervise digital asset businesses, a step towards a full licensing regime.",
      "The guidance signals that platforms dealing with Ghanaian customers will need to register and meet consumer-protection rules. Details on timelines are still being finalised.",
      { h2: "What users can do now" },
      "Use platforms that publish their company details and complaints process, avoid anyone promising guaranteed returns, and keep a record of every trade.",
    ),
    sources: src([
      ["Bank of Ghana", "https://www.bog.gov.gh/"],
      ["Securities and Exchange Commission Ghana", "https://sec.gov.gh/"],
    ]),
    authors: refs(["author.wanjiru-kamau"]),
    countries: refs(["country.gh"]),
    coins: [],
    category: ref("category.regulation"),
    tags: [],
    heroImage: hero(4, "Layered translucent rectangles in warm tones"),
    publishedAt: "2026-11-05T15:30:00Z",
    isBreaking: false,
  },
  {
    _id: "article.ethereum-upgrade-everyday-users",
    _type: "article",
    title: "Ethereum's next network upgrade: what changes for everyday users",
    slug: slug("ethereum-upgrade-everyday-users"),
    type: "news",
    bottomLine: [
      "Network upgrades change how Ethereum works under the hood; you don't need to do anything with your ETH.",
      "Anyone telling you to 'migrate' or 'upgrade' your tokens is running a scam.",
      "Fees on layer-2 networks are the change most users will notice.",
    ],
    body: pt(
      "a5",
      "Ethereum developers schedule upgrades to the network a few times a year. Each one changes the rules that nodes follow, but the ETH and tokens in your wallet stay exactly where they are.",
      { h2: "No action needed" },
      "You do not need to move, swap or 'upgrade' your coins. Scammers use upgrades as cover, sending messages that ask users to connect a wallet to a fake migration site.",
      { _type: "callout", tone: "warning", body: "Never connect your wallet to a site because a message said an upgrade requires it." },
      { h2: "What you might notice" },
      "Recent upgrades have focused on making layer-2 networks cheaper. If you use apps on networks like Base or Arbitrum, fees may fall.",
    ),
    sources: src([["Ethereum.org: roadmap", "https://ethereum.org/en/roadmap/"]]),
    authors: refs(["author.thabo-nkosi"]),
    countries: [],
    coins: ["ethereum"],
    category: ref("category.markets"),
    tags: refs(["tag.ethereum"]),
    heroImage: hero(5, "Interlocking diamond shapes in purple and lime"),
    publishedAt: "2026-11-04T10:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.stablecoins-africa-savings",
    _type: "article",
    title: "Why stablecoins became a savings account for millions of Africans",
    slug: slug("stablecoins-africa-savings"),
    type: "analysis",
    bottomLine: [
      "Dollar stablecoins let people hold dollars without a US bank account.",
      "They carry real risks: issuer risk, platform risk and local rules.",
      "They are a tool for holding value, not an investment that earns returns by itself.",
    ],
    body: pt(
      "a6",
      "In countries where the local currency has lost value quickly, holding dollars is a common way to protect savings. Stablecoins such as USDT and USDC have made that easier: anyone with a phone can hold a token designed to track the US dollar.",
      { _type: "chart", title: "USDT price in local currency", coinId: "tether", range: "1Y" },
      { h2: "The risks people underestimate" },
      { bullets: ["Issuer risk: a stablecoin is only as good as the reserves behind it.", "Platform risk: if an exchange fails, your balance may be frozen.", "Rules: some countries restrict how stablecoins can be bought or sold."] },
      "For many users the trade-off is still worth it. But it pays to understand what you are holding.",
    ),
    sources: src([
      ["Tether transparency page", "https://tether.to/en/transparency/"],
      ["Circle USDC transparency", "https://www.circle.com/transparency"],
    ]),
    authors: refs(["author.amara-okafor"]),
    countries: refs(["country.ng", "country.ke", "country.gh"]),
    coins: ["tether", "usd-coin"],
    category: ref("category.markets"),
    tags: refs(["tag.stablecoins"]),
    heroImage: hero(6, "Stacked coins rendered as flat circles"),
    publishedAt: "2026-11-03T08:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.lagos-p2p-naira-rate",
    _type: "article",
    title: "P2P trading in Lagos: how buyers and sellers set the naira rate",
    slug: slug("lagos-p2p-naira-rate"),
    type: "local",
    bottomLine: [
      "P2P rates reflect supply and demand for dollars, not just the official rate.",
      "Merchants' reputation scores and completion rates matter as much as price.",
      "Never release coins or pay outside the platform's escrow.",
    ],
    body: pt(
      "a7",
      "On P2P marketplaces, Nigerians trade USDT and bitcoin directly with each other, paying by bank transfer. The platform holds the crypto in escrow until the seller confirms payment.",
      { h2: "How the rate forms" },
      "Merchants post buy and sell offers. When demand for dollars is high, sellers quote a premium. Watching the gap between the best buy and sell offers tells you how tight the market is.",
      { h2: "Staying safe" },
      { bullets: ["Trade only with verified merchants who have many completed trades.", "Keep all chat and payment on the platform.", "Watch out for fake payment screenshots."] },
    ),
    sources: src([["Central Bank of Nigeria: exchange rates", "https://www.cbn.gov.ng/rates/"]]),
    authors: refs(["author.amara-okafor"]),
    countries: refs(["country.ng"]),
    coins: ["tether", "bitcoin"],
    category: ref("category.markets"),
    tags: refs(["tag.p2p", "tag.stablecoins"]),
    heroImage: hero(7, "Two overlapping circles in lime and coral"),
    publishedAt: "2026-11-02T11:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.fake-airdrop-sites-draining-wallets",
    _type: "article",
    title: "Fake airdrop sites are draining wallets: how to spot them",
    slug: slug("fake-airdrop-sites-draining-wallets"),
    type: "safety",
    bottomLine: [
      "Fake airdrop sites trick you into signing a transaction that empties your wallet.",
      "Real airdrops never need your seed phrase or an 'approve all' signature.",
      "Check the project's official channels and scan the token contract first.",
    ],
    body: pt(
      "a8",
      "Airdrops, free tokens given to early users, are a favourite lure for scammers. Fake sites copy a real project's branding and ask visitors to connect a wallet to 'claim'.",
      { _type: "callout", tone: "danger", body: "If a site asks you to sign an approval for 'all tokens' or to enter your seed phrase, close it." },
      { h2: "The warning signs" },
      { bullets: ["The link came from a reply, DM or ad rather than the project's own site.", "The URL is slightly misspelled.", "The site creates urgency: 'claim within 10 minutes'."] },
      { _type: "safetyBadge", chain: "ethereum", contractAddress: "0x0000000000000000000000000000000000000000", level: "high", label: "Example of a high-risk scan result" },
      { link: { before: "Before interacting with a new token, ", text: "run it through our scanner", href: "/safety/scanner", after: " and check our verified airdrops list." } },
    ),
    sources: src([
      ["Ethereum.org: staying safe", "https://ethereum.org/en/security/"],
      ["Chainabuse scam reports", "https://www.chainabuse.com/"],
    ]),
    authors: refs(["author.thabo-nkosi"]),
    countries: [],
    coins: ["ethereum"],
    category: ref("category.safety"),
    tags: refs(["tag.scams", "tag.wallets"]),
    heroImage: hero(8, "Warning triangle made of coral lines"),
    publishedAt: "2026-11-01T14:00:00Z",
    isBreaking: false,
    faq: [
      { _key: "f0", question: "Do real airdrops ask for my seed phrase?", answer: "No. No legitimate airdrop, exchange or wallet will ever ask for your seed phrase." },
      { _key: "f1", question: "What should I do if I signed a malicious approval?", answer: "Revoke the approval with a token-approval checker, move remaining funds to a new wallet, and report the site." },
    ],
  },
  {
    _id: "article.telegram-investment-manager-scam",
    _type: "article",
    title: "The Telegram 'investment manager' scam: the warning signs",
    slug: slug("telegram-investment-manager-scam"),
    type: "safety",
    bottomLine: [
      "Scammers pose as account managers promising daily returns.",
      "They show fake profits, then demand 'fees' before you can withdraw.",
      "Nobody can guarantee crypto returns. Block and report anyone who does.",
    ],
    body: pt(
      "a9",
      "A common scam starts with a friendly message on Telegram or WhatsApp from someone who says they manage crypto investments. They share screenshots of big profits and offer to grow your money.",
      { h2: "How it unfolds" },
      "Victims deposit a small amount and see it 'grow' on a dashboard the scammer controls. When they try to withdraw, they're told to pay a tax or unlock fee first. The money never comes back.",
      { bullets: ["Guaranteed or daily returns.", "Pressure to recruit friends.", "Withdrawal 'fees' paid upfront."] },
    ),
    sources: src([["Chainabuse scam reports", "https://www.chainabuse.com/"]]),
    authors: refs(["author.thabo-nkosi"]),
    countries: refs(["country.ng", "country.ke", "country.za", "country.gh"]),
    coins: [],
    category: ref("category.safety"),
    tags: refs(["tag.scams"]),
    heroImage: hero(9, "Chat bubbles with a broken chain motif"),
    publishedAt: "2026-10-31T10:00:00Z",
    isBreaking: false,
  },
  {
    _id: "article.what-is-a-seed-phrase",
    _type: "article",
    title: "What is a seed phrase, and why nobody should ever ask for yours",
    slug: slug("what-is-a-seed-phrase"),
    type: "learn",
    bottomLine: [
      "A seed phrase is the master key to your wallet: whoever has it controls your funds.",
      "Write it down offline and never type it into a website or share it.",
      "Support staff, exchanges and airdrops will never ask for it.",
    ],
    body: pt(
      "a10",
      "When you create a self-custody wallet, it shows you 12 or 24 words. That list is your seed phrase. It can rebuild your wallet on any device, which makes it the most important thing you own in crypto.",
      { h2: "How to store it" },
      { bullets: ["Write it on paper (or metal) and keep it somewhere safe.", "Don't screenshot it or store it in notes or email.", "Consider a second copy in another safe place."] },
      "If anyone asks for your seed phrase, for any reason, it is a scam.",
    ),
    sources: src([["Ethereum.org: wallets", "https://ethereum.org/en/wallets/"]]),
    authors: refs(["author.thabo-nkosi"]),
    countries: [],
    coins: [],
    category: ref("category.explainers"),
    tags: refs(["tag.wallets"]),
    heroImage: hero(10, "Grid of small squares forming a key shape"),
    publishedAt: "2026-10-30T09:00:00Z",
    isBreaking: false,
    faq: [{ _key: "f0", question: "Can I recover my wallet without the seed phrase?", answer: "Usually not. Without the seed phrase, a lost self-custody wallet generally cannot be recovered." }],
  },
];

// ---------------------------------------------------------------------------------------------
// Sponsored posts (rendered only under /press) and corrections
// ---------------------------------------------------------------------------------------------
interface SeedSponsored extends Omit<SeedArticle, "_type" | "isBreaking"> {
  _type: "sponsoredPost";
  kind: "sponsored" | "pressRelease";
  sponsorName: string;
  disclosureText: string;
  noindex: boolean;
  linksRel: "sponsored nofollow";
}

export const seedSponsoredPosts: SeedSponsored[] = [
  {
    _id: "sponsoredPost.example-wallet-naira-onramp",
    _type: "sponsoredPost",
    kind: "sponsored",
    sponsorName: "Example Wallet Co.",
    disclosureText: "This post was paid for by Example Wallet Co. Our newsroom did not write or edit it. Not financial advice.",
    noindex: false,
    linksRel: "sponsored nofollow",
    title: "Example Wallet adds a naira on-ramp for first-time buyers",
    slug: slug("example-wallet-naira-onramp"),
    type: "analysis",
    bottomLine: ["Example Wallet now lets users in Nigeria buy USDT with a bank transfer.", "Fees and limits are listed on the sponsor's website."],
    body: pt(
      "sp1",
      "Example Wallet Co. says its new on-ramp lets users fund a self-custody wallet with naira in a few steps.",
      { link: { before: "Details of fees and limits are on ", text: "the sponsor's website", href: "https://example.com/naira", after: "." } },
    ),
    sources: src([["Example Wallet Co. announcement", "https://example.com/news"]]),
    authors: refs(["author.amara-okafor"]),
    countries: refs(["country.ng"]),
    coins: ["tether"],
    category: ref("category.markets"),
    tags: [],
    heroImage: hero(6, "Sponsor illustration of stacked coins"),
    publishedAt: "2026-11-07T16:00:00Z",
  },
  {
    _id: "sponsoredPost.example-chain-ghana-hackathon",
    _type: "sponsoredPost",
    kind: "pressRelease",
    sponsorName: "Example Chain Foundation",
    disclosureText: "Press release supplied by Example Chain Foundation and published unedited. Not financial advice.",
    noindex: true,
    linksRel: "sponsored nofollow",
    title: "Example Chain Foundation announces a developer hackathon in Accra",
    slug: slug("example-chain-ghana-hackathon"),
    type: "news",
    bottomLine: ["A three-day developer hackathon is planned for Accra.", "Registration details are on the organiser's site."],
    body: pt("sp2", "Example Chain Foundation will host a developer hackathon in Accra, with workshops for students and early-stage teams."),
    sources: src([["Example Chain Foundation", "https://example.com/hackathon"]]),
    authors: refs(["author.wanjiru-kamau"]),
    countries: refs(["country.gh"]),
    coins: [],
    category: ref("category.markets"),
    tags: [],
    heroImage: hero(4, "Sponsor illustration of layered shapes"),
    publishedAt: "2026-11-06T12:00:00Z",
  },
];

export const seedCorrections = [
  {
    _id: "correction.ethereum-upgrade-fees",
    _type: "correction",
    article: ref("article.ethereum-upgrade-everyday-users"),
    date: "2026-11-05",
    note: "An earlier version said every Ethereum upgrade lowers fees on the main network. Recent upgrades mainly reduced fees on layer-2 networks; the article has been corrected.",
  },
];

// ---------------------------------------------------------------------------------------------
// Partners hub. PLACEHOLDER prices and audience figures: set real ones in the Studio before launch.
// ---------------------------------------------------------------------------------------------
const pkg = (code: string, name: string, priceUsd: number, summary: string, deliverables: string[], order: number, priceNote?: string) => ({
  _id: `package.${code}`,
  _type: "package" as const,
  code,
  name,
  priceUsd,
  ...(priceNote ? { priceNote } : {}),
  summary,
  deliverables,
  order,
  active: true,
});

export const seedPackages = [
  pkg("pr-basic", "Press release", 300, "Publish your announcement in our labelled press section.", ["Published under /press with a clear label", "Shared once on Telegram", "Do-not-follow links, as with all paid content"], 10),
  pkg("sponsored-article", "Sponsored article", 900, "A clearly labelled article you supply, edited for clarity and our standards.", ["Labelled 'Sponsored' with a disclosure line", "Social preview image", "30-day placement on the press index"], 20),
  pkg("newsletter-top-slot", "Newsletter top slot", 600, "The first placement in one edition of our daily brief.", ["One edition, top position", "Clicks and opens reported"], 30, "per edition"),
  pkg("launch-in-nigeria", "Launch in Nigeria", 3500, "A launch bundle for teams entering the Nigerian market.", ["Sponsored article + press release", "Two newsletter slots", "Verified directory listing", "Local P2P and regulation briefing"], 40),
  pkg("launch-in-kenya", "Launch in Kenya", 3000, "A launch bundle for teams entering the Kenyan market.", ["Sponsored article + press release", "Two newsletter slots", "Verified directory listing", "Local regulation briefing"], 50),
  pkg("directory-verified", "Directory: Verified", 150, "A verified badge on your directory listing after KYB checks.", ["KYB review", "Verified badge", "Higher placement in listings"], 60, "per month"),
  pkg("directory-featured", "Directory: Featured", 450, "Top placement in your category and country pages.", ["Everything in Verified", "Featured strip on the homepage", "Top of category lists"], 70, "per month"),
  pkg("sponsored-research", "Sponsored research", 6000, "A co-branded research report with our methodology and independence rules.", ["Report design and data analysis", "Gated download with lead sharing (opt-in)", "Launch newsletter feature"], 80, "from"),
];

export const seedPartnerSettings = {
  _id: "partnerSettings",
  _type: "partnerSettings",
  headline: "Reach crypto users across Africa",
  intro: "Labelled, standards-checked placements in front of readers in Nigeria, Kenya, South Africa and Ghana. No gambling, betting or loan advertisers.",
  audienceStats: [
    { _key: "s0", label: "Monthly readers", value: "Sample: 250k", note: "Placeholder until launch" },
    { _key: "s1", label: "Newsletter subscribers", value: "Sample: 40k", note: "Placeholder until launch" },
    { _key: "s2", label: "Telegram + WhatsApp community", value: "Sample: 60k", note: "Placeholder until launch" },
  ],
  statsUpdatedAt: "2026-11-01",
  countries: ["ng", "ke", "za", "gh"],
  formats: [
    { _key: "f0", name: "Sponsored articles", description: "Labelled articles under /press, never mixed with our news." },
    { _key: "f1", name: "Newsletter placements", description: "Top slot in the daily brief." },
    { _key: "f2", name: "Directory listings", description: "Verified and Featured tiers for exchanges, wallets and services." },
    { _key: "f3", name: "Research", description: "Sponsored reports with our methodology and independence rules." },
  ],
};

export const seedDocuments = [
  ...seedAuthors,
  ...seedCountries,
  ...seedCategories,
  ...seedTags,
  ...seedArticles,
  ...seedSponsoredPosts,
  ...seedCorrections,
  ...seedPackages,
  seedPartnerSettings,
];
export type SeedDocument = (typeof seedDocuments)[number];
