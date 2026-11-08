/**
 * Tiny Portable Text builder for seed fixtures. Kept dependency-free (and free of path aliases)
 * so `node studio/scripts/export-seed.ts` can import it with Node's built-in type stripping.
 */
export interface SeedSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

export interface SeedBlock {
  _type: "block";
  _key: string;
  style: string;
  markDefs: { _key: string; _type: string; href?: string }[];
  children: SeedSpan[];
  listItem?: "bullet" | "number";
  level?: number;
}

export type SeedCustom = { _type: string; _key: string } & Record<string, unknown>;
export type SeedBodyNode = SeedBlock | SeedCustom;

export type PtInput =
  | string
  | { h2: string }
  | { h3: string }
  | { bullets: string[] }
  | { link: { before: string; text: string; href: string; after: string } }
  | ({ _type: string } & Record<string, unknown>);

export function pt(prefix: string, ...items: PtInput[]): SeedBodyNode[] {
  let n = 0;
  const key = () => `${prefix}${(n++).toString(36)}`;
  const block = (text: string, style = "normal", extra: Partial<SeedBlock> = {}): SeedBlock => ({
    _type: "block",
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: "span", _key: key(), text, marks: [] }],
    ...extra,
  });

  const out: SeedBodyNode[] = [];
  for (const item of items) {
    if (typeof item === "string") out.push(block(item));
    else if ("h2" in item) out.push(block(item.h2 as string, "h2"));
    else if ("h3" in item) out.push(block(item.h3 as string, "h3"));
    else if ("bullets" in item)
      for (const b of item.bullets as string[]) out.push(block(b, "normal", { listItem: "bullet", level: 1 }));
    else if ("link" in item) {
      const l = item.link as { before: string; text: string; href: string; after: string };
      const linkKey = key();
      out.push({
        _type: "block",
        _key: key(),
        style: "normal",
        markDefs: [{ _key: linkKey, _type: "link", href: l.href }],
        children: [
          { _type: "span", _key: key(), text: l.before, marks: [] },
          { _type: "span", _key: key(), text: l.text, marks: [linkKey] },
          { _type: "span", _key: key(), text: l.after, marks: [] },
        ],
      });
    } else out.push({ ...item, _key: key() } as SeedCustom);
  }
  return out;
}
