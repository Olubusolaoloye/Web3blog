import { defineQuery } from "groq";

/*
 * Editorial queries select `_type == "article"` only, so sponsoredPost documents can never leak into
 * editorial lists (CLAUDE.md §7.11, rule 2).
 */

const imageProjection = /* groq */ `{
  alt,
  "assetRef": asset._ref,
  "url": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height
}`;

const summaryProjection = /* groq */ `
  "id": _id,
  "slug": slug.current,
  title,
  type,
  bottomLine,
  "heroImage": heroImage${imageProjection},
  publishedAt,
  updatedAt,
  "isBreaking": coalesce(isBreaking, false),
  "category": category->{title, "slug": slug.current}
`;

const authorProjection = /* groq */ `{
  name,
  "slug": slug.current,
  role,
  bio,
  "expertise": coalesce(expertise, []),
  holdingsDisclosure,
  "photo": photo${imageProjection}
}`;

export const articleListQuery = defineQuery(`
  *[_type == "article" && defined(slug.current) && ($type == null || type == $type)]
    | order(publishedAt desc)[0...$limit]{ ${summaryProjection} }
`);

export const articleBySlugQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{
    ${summaryProjection},
    body,
    "sources": coalesce(sources[]{label, url}, []),
    "authors": coalesce(authors[]->${authorProjection}, []),
    "editor": editor->${authorProjection},
    "countries": coalesce(countries[]->code, []),
    "coins": coalesce(coins, []),
    "tags": coalesce(tags[]->{title, "slug": slug.current}, []),
    seo{title, description},
    "faq": faq[]{question, answer}
  }
`);
