import { blockContent, callout, chart, embedTweet, priceChip, richText, safetyBadge } from "./objects/bodyBlocks";
import { faqItem } from "./objects/faqItem";
import { seo } from "./objects/seo";
import { source } from "./objects/source";
import { article } from "./documents/article";
import { country } from "./documents/country";
import { course, lesson, quiz } from "./documents/learn";
import { author } from "./documents/people";
import { correction, researchReport } from "./documents/research";
import { siteSettings } from "./documents/siteSettings";
import { sponsoredPost } from "./documents/sponsoredPost";
import { category, tag } from "./documents/taxonomy";

export const schemaTypes = [
  // objects
  seo,
  source,
  faqItem,
  priceChip,
  callout,
  embedTweet,
  chart,
  safetyBadge,
  blockContent,
  richText,
  // documents
  article,
  sponsoredPost,
  author,
  country,
  category,
  tag,
  course,
  lesson,
  quiz,
  researchReport,
  correction,
  siteSettings,
];

export const SINGLETON_TYPES = new Set(["siteSettings"]);
