import { defineQuery } from "groq";

/*
 * Editorial queries select `_type == "article"` only, so sponsoredPost documents can never leak into
 * editorial lists (CLAUDE.md §7.11, rule 2). Sponsored queries are separate and used only by /press routes.
 */

const imageProjection = /* groq */ `{
  alt,
  "assetRef": asset._ref,
  "url": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height
}`;

const summaryFields = /* groq */ `
  "id": _id,
  "docType": _type,
  "slug": slug.current,
  title,
  type,
  bottomLine,
  "heroImage": heroImage${imageProjection},
  publishedAt,
  updatedAt,
  "isBreaking": coalesce(isBreaking, false),
  "category": category->{title, "slug": slug.current},
  "authorNames": coalesce(authors[]->name, [])
`;

const authorProjection = /* groq */ `{
  name,
  "slug": slug.current,
  role,
  bio,
  "expertise": coalesce(expertise, []),
  holdingsDisclosure,
  "photo": photo${imageProjection},
  "socials": coalesce(socials, {})
}`;

const bodyFields = /* groq */ `
  body,
  "sources": coalesce(sources[]{label, url}, []),
  "authors": coalesce(authors[]->${authorProjection}, []),
  "editor": editor->${authorProjection},
  "countries": coalesce(countries[]->code, []),
  "coins": coalesce(coins, []),
  "tags": coalesce(tags[]->{title, "slug": slug.current}, []),
  seo{title, description},
  "faq": faq[]{question, answer}
`;

const articleFilter = /* groq */ `
  _type == "article" && defined(slug.current)
  && ($type == null || type == $type)
  && ($category == null || category->slug.current == $category)
  && ($author == null || $author in authors[]->slug.current)
  && ($country == null || upper($country) in countries[]->code)
  && ($since == null || publishedAt >= $since)
  && ($exclude == null || slug.current != $exclude)
  && ($q == null || title match $q || bottomLine[] match $q)
`;

export const articleListQuery = defineQuery(`{
  "items": *[${articleFilter}] | order(publishedAt desc)[$offset...$end]{ ${summaryFields} },
  "total": count(*[${articleFilter}])
}`);

export const articleBySlugQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{ ${summaryFields}, ${bodyFields} }
`);

/** Hand-picked related stories (article refs only), falling back to the automatic query below. */
export const pickedRelatedQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0].related[]->[_type == "article"]{ ${summaryFields} }
`);

export const autoRelatedQuery = defineQuery(`
  *[_type == "article" && defined(slug.current) && slug.current != $slug && (
    category->slug.current == $category
    || count((tags[]->slug.current)[@ in $tags]) > 0
    || count((countries[]->code)[@ in $countries]) > 0
  )] | order(publishedAt desc)[0...$limit]{ ${summaryFields} }
`);

export const categoriesQuery = defineQuery(`*[_type == "category"] | order(title asc){ title, "slug": slug.current }`);

export const authorBySlugQuery = defineQuery(`*[_type == "author" && slug.current == $slug][0]${authorProjection}`);
export const authorsQuery = defineQuery(`*[_type == "author"] | order(name asc)${authorProjection}`);

const sponsoredSummaryFields = /* groq */ `
  "id": _id,
  "docType": _type,
  "slug": slug.current,
  title,
  bottomLine,
  "heroImage": heroImage${imageProjection},
  publishedAt,
  updatedAt,
  kind,
  sponsorName,
  "noindex": coalesce(noindex, false)
`;

export const sponsoredBySlugQuery = defineQuery(`
  *[_type == "sponsoredPost" && slug.current == $slug][0]{
    ${sponsoredSummaryFields},
    type,
    disclosureText,
    "category": category->{title, "slug": slug.current},
    "authorNames": coalesce(authors[]->name, []),
    ${bodyFields}
  }
`);

export const sponsoredListQuery = defineQuery(`
  *[_type == "sponsoredPost" && defined(slug.current) && ($includeNoindex || coalesce(noindex, false) == false)]
    | order(publishedAt desc)[0...$limit]{ ${sponsoredSummaryFields} }
`);

export const correctionsQuery = defineQuery(`
  *[_type == "correction" && defined(article->slug.current)] | order(date desc){
    "id": _id, date, note, "article": article->{ "slug": slug.current, title }
  }
`);
