import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root as HastRoot, RootContent, Element } from "hast";
import { toString as hastToString } from "hast-util-to-string";

// Raw HTML inside the Markdown is dropped by remark-rehype (allowDangerousHtml
// defaults to false), and the resulting tree is still run through
// rehype-sanitize with the GitHub schema as a second line of defence.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow the heading ids rehype-slug adds so in-document links work.
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
  },
};

/**
 * The same filter, plus the three tags the diff renderer wraps changed words
 * in and the class attribute its wrappers carry.
 *
 * It exists so that every string the diff emits has been through
 * rehype-sanitize — including the nodes the renderer builds itself. Allowing
 * `className` here is not a hole: the document's own class attributes were
 * already dropped by `schema` on the way in, so by the time this pass runs the
 * only class names in the tree are ours.
 *
 * Clobbering is off: `schema` already prefixed every id with `user-content-`,
 * and a second pass would prefix it twice.
 */
const baseAttributes = (schema.attributes ?? {}) as Record<string, unknown[]>;
const withClass = (tag: string) => [...(baseAttributes[tag] ?? []), "className"];
/** rehype-sanitize's own option type, without importing its transitive dep. */
type SanitizeSchema = NonNullable<Parameters<typeof rehypeSanitize>[0]>;

const decoratedSchema: SanitizeSchema = {
  ...schema,
  clobber: [],
  clobberPrefix: "",
  tagNames: [...(schema.tagNames ?? []), "mark", "del", "ins"],
  attributes: {
    ...baseAttributes,
    div: withClass("div"),
    p: withClass("p"),
    span: withClass("span"),
    mark: ["className"],
    del: ["className"],
    ins: ["className"],
  },
} as SanitizeSchema;

/**
 * Put every table in its own horizontally scrollable box so a wide table
 * scrolls instead of pushing the column (or the PDF page) out of shape.
 *
 * This runs *after* rehype-sanitize on purpose: the wrapper is ours, not the
 * document's, so it needs no place in the schema and no attribute of it can
 * come from the Markdown.
 */
function rehypeWrapTables() {
  return (root: HastRoot) => {
    const wrap = (nodes: RootContent[]): RootContent[] =>
      nodes.map((node) => {
        if (node.type !== "element") return node;
        node.children = wrap(node.children) as Element["children"];
        if (node.tagName !== "table") return node;
        return {
          type: "element",
          tagName: "div",
          properties: { className: ["table-scroll"] },
          children: [node],
        } satisfies Element;
      });
    root.children = wrap(root.children);
  };
}

// A line that carries on a list item's paragraph without being indented to
// the item's content column — CommonMark's "lazy continuation".
const LIST_MARKER = /^(\s*)([-*+]|\d{1,9}[.)])([ \t]+)(?=\S)/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
// Blocks that already interrupt a paragraph, so CommonMark ends the list on
// them by itself and there is nothing for us to do.
const BLOCK_START = /^ {0,3}(#{1,6}\s|>|={3,}\s*$|-{3,}\s*$|\*{3,}\s*$|_{3,}\s*$|<)/;

/**
 * Close a list where Obsidian closes it — before parsing, because the
 * difference is a parsing one and does not survive into the tree.
 *
 * CommonMark lets an unindented line carry on the paragraph of the list item
 * above it, so
 *
 *     Timour:
 *     * Sign-off on the definitions
 *     Seref:
 *     * Thresholds
 *
 * puts "Seref:" *inside* the first list, where remark-breaks then drops it
 * onto its own line under the bullet. Obsidian has no lazy continuation:
 * "Seref:" is a paragraph, and it ends the list. A blank line inserted ahead
 * of such a line says exactly that in CommonMark's own terms.
 *
 * Doing this on the source rather than on the mdast is not a shortcut. A
 * lazy line and a properly indented continuation produce the *same* text
 * node value — the indentation is stripped either way — so only the source
 * still knows which is which.
 *
 * A line is lazy when it is not blank, not a new list marker, not a block
 * that already interrupts the paragraph, not inside a fence, and indented
 * less than the item's content column *and* no further than the outermost
 * list's own marker. That last clause is what keeps nested lists intact: a
 * line indented under the outer item is still part of it.
 */
export function closeListsAtLazyLines(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  /** Indent of the outermost currently open list marker; -1 for none. */
  let outerIndent = -1;
  /** Content column of the most recent list item; -1 for none. */
  let contentColumn = -1;
  let afterBlank = true;

  for (const line of lines) {
    const fenced = FENCE.exec(line);
    if (fence !== null) {
      out.push(line);
      if (fenced && fenced[1][0] === fence[0] && fenced[1].length >= fence.length) fence = null;
      afterBlank = false;
      continue;
    }
    if (fenced) {
      fence = fenced[1];
      out.push(line);
      afterBlank = false;
      continue;
    }
    if (line.trim() === "") {
      out.push(line);
      afterBlank = true;
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const marker = LIST_MARKER.exec(line);
    if (marker) {
      if (outerIndent === -1 || indent < outerIndent) outerIndent = indent;
      contentColumn = marker[1].length + marker[2].length + marker[3].length;
      out.push(line);
      afterBlank = false;
      continue;
    }

    if (contentColumn !== -1 && indent < contentColumn) {
      if (!afterBlank && indent <= outerIndent && !BLOCK_START.test(line)) {
        out.push("");
        out.push(line);
        outerIndent = -1;
        contentColumn = -1;
        afterBlank = false;
        continue;
      }
      if (indent <= outerIndent) {
        outerIndent = -1;
        contentColumn = -1;
      }
    }
    out.push(line);
    afterBlank = false;
  }

  return out.join("\n");
}

/* ---------------------------------------------------------------------------
   Block boundaries. The diff works block by block, and its idea of a block
   has to be the renderer's own or a changed paragraph lands half inside the
   block above it. Both start from `closeListsAtLazyLines` output — the source
   the parser actually sees — and `topLevelBlocks` below reads the boundaries
   straight off the mdast so the two can be tested against each other.
   --------------------------------------------------------------------------- */

const ATX = /^ {0,3}#{1,6}(\s|$)/;
const THEMATIC = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
/** A `===`/`---` underline, which turns the paragraph above it into a heading. */
const SETEXT = /^ {0,3}(?:=+|-+)[ \t]*$/;
const QUOTE = /^ {0,3}>/;
/** The start of a raw-HTML block, which the renderer drops but the splitter
 *  still has to keep out of the paragraph beside it. */
const BLOCK_HTML = /^ {0,3}<[A-Za-z/!?]/;
/** A GFM delimiter row: `|---|:--:|`. Checked together with an actual pipe. */
const TABLE_DELIM = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

export type BlockKind =
  | "heading"
  | "paragraph"
  | "list-item"
  | "table"
  | "code"
  | "quote"
  | "rule"
  | "html";

/** One unit of change: what the rendered diff marks added, removed, or kept. */
export type SourceBlock = {
  kind: BlockKind;
  /** The block's own lines, joined. Never the blank lines around it. */
  text: string;
  /** 1-based, into `closeListsAtLazyLines(markdown)` — not the raw input. */
  startLine: number;
  endLine: number;
};

function isTableDelimiter(line: string): boolean {
  return line.includes("|") && TABLE_DELIM.test(line);
}

/**
 * Split a document into the blocks the diff compares.
 *
 * A block is a heading, a paragraph, one list item, a table, a fenced code
 * block, a blockquote, or a thematic break. Two of those are choices worth
 * naming:
 *
 * - **A list item, not a list.** Adding one bullet to a twelve-item list is
 *   one added block, not a rewritten list.
 * - **A table, not a table row.** A row on its own is not a table — rendered
 *   alone it is a paragraph of pipe characters — and the rendered diff shows
 *   a changed table whole anyway. The Markdown mode is line-based, so a
 *   single changed row still reads as a single changed line there.
 *
 * Blank lines belong to no block; every block's lines are contiguous.
 */
export function splitBlocks(markdown: string): SourceBlock[] {
  const lines = closeListsAtLazyLines(markdown).split("\n");
  const blocks: SourceBlock[] = [];
  /** `from` and `to` are 1-based and inclusive. */
  const push = (kind: BlockKind, from: number, to: number) =>
    blocks.push({
      kind,
      text: lines.slice(from - 1, to).join("\n"),
      startLine: from,
      endLine: to,
    });

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const n = i + 1;

    // Blank lines belong to no block.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // A fence runs to its closer, whatever it contains.
    const fenced = FENCE.exec(line);
    if (fenced) {
      const marker = fenced[1];
      let j = i + 1;
      while (j < lines.length) {
        const closer = FENCE.exec(lines[j]);
        j += 1;
        if (closer && closer[1][0] === marker[0] && closer[1].length >= marker.length) break;
      }
      push("code", n, j);
      i = j;
      continue;
    }

    if (ATX.test(line)) {
      push("heading", n, n);
      i += 1;
      continue;
    }

    // At the start of a block `---` is a rule; under a paragraph it is a
    // setext heading, which the paragraph branch below handles.
    if (THEMATIC.test(line)) {
      push("rule", n, n);
      i += 1;
      continue;
    }

    const marker = LIST_MARKER.exec(line);
    if (marker) {
      const contentColumn = marker[1].length + marker[2].length + marker[3].length;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (next.trim() === "") break;
        if (LIST_MARKER.test(next)) break; // a nested item is its own block
        if (next.length - next.trimStart().length < contentColumn) break;
        j += 1;
      }
      push("list-item", n, j);
      i = j;
      continue;
    }

    if (QUOTE.test(line)) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "" && QUOTE.test(lines[j])) j += 1;
      push("quote", n, j);
      i = j;
      continue;
    }

    // A table announces itself with the delimiter row under its header.
    if (line.includes("|") && isTableDelimiter(lines[i + 1] ?? "")) {
      let j = i + 1;
      while (j < lines.length) {
        const row = lines[j];
        if (row.trim() === "" || ATX.test(row) || FENCE.test(row) || !row.includes("|")) break;
        j += 1;
      }
      push("table", n, j);
      i = j;
      continue;
    }

    // Paragraph, or a raw-HTML block: to the next blank line, or the next
    // line that opens a block of its own. A setext underline joins it and
    // makes it a heading.
    const html = BLOCK_HTML.test(line);
    let j = i + 1;
    let setext = false;
    while (j < lines.length) {
      const next = lines[j];
      if (next.trim() === "") break;
      if (!html && SETEXT.test(next)) {
        setext = true;
        j += 1;
        break;
      }
      if (
        ATX.test(next) ||
        FENCE.test(next) ||
        THEMATIC.test(next) ||
        QUOTE.test(next) ||
        LIST_MARKER.test(next) ||
        (next.includes("|") && isTableDelimiter(lines[j + 1] ?? ""))
      ) {
        break;
      }
      j += 1;
    }
    push(html ? "html" : setext ? "heading" : "paragraph", n, j);
    i = j;
  }

  return blocks;
}

const mdastProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks);

/** Where each of the renderer's own top-level blocks starts and ends, in
 *  `closeListsAtLazyLines` lines. Read off the mdast, so it is the parser's
 *  answer rather than a second opinion — which is what makes it worth
 *  testing `splitBlocks` against. */
export function topLevelBlocks(
  markdown: string,
): { type: string; startLine: number; endLine: number }[] {
  const root = mdastProcessor.parse(closeListsAtLazyLines(markdown));
  return root.children.flatMap((node) =>
    node.position
      ? [{ type: node.type, startLine: node.position.start.line, endLine: node.position.end.line }]
      : [],
  );
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Obsidian renders a single newline as a line break ("strict line breaks"
  // off). remark-breaks only touches soft breaks in paragraph text — tables,
  // code blocks, and lists are parsed before it ever sees them.
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeSanitize, schema)
  .use(rehypeWrapTables);

const stringifier = unified().use(rehypeStringify);
const decorator = unified().use(rehypeSanitize, decoratedSchema);

export type RenderedSection = {
  /** Plain-text heading of the H2 that opened this section, if any. */
  heading: string | null;
  /** The H2's id attribute, for anchors. */
  id: string | null;
  /** Sanitized HTML for the section, including its own H2. */
  html: string;
};

/** One entry in the reader's contents pane. */
export type TocEntry = {
  /** 2, 3, or 4 — the heading level. */
  depth: number;
  id: string;
  text: string;
};

export type RenderedDocument = {
  title: string | null;
  description: string | null;
  sections: RenderedSection[];
  toc: TocEntry[];
};

function elementsOf(root: HastRoot): RootContent[] {
  return root.children;
}

function isH1(node: RootContent): node is Element {
  return node.type === "element" && node.tagName === "h1";
}

function isH2(node: RootContent): node is Element {
  return node.type === "element" && node.tagName === "h2";
}

function isParagraph(node: RootContent): node is Element {
  return node.type === "element" && node.tagName === "p";
}

function stringify(nodes: RootContent[]): string {
  return stringifier.stringify({ type: "root", children: nodes });
}

/** Parse and sanitize; the heavy lifting shared by every representation. */
async function toTree(markdown: string): Promise<HastRoot> {
  const source = closeListsAtLazyLines(markdown);
  const tree = await processor.run(processor.parse(source));
  return tree as HastRoot;
}

/** Title is the first H1's text; null if there isn't one. */
export function inferTitleFromTree(root: HastRoot): string | null {
  const h1 = elementsOf(root).find(isH1);
  const text = h1 ? hastToString(h1).trim() : "";
  return text || null;
}

/** Description is the first paragraph after the title, clipped for OG cards. */
export function inferDescriptionFromTree(
  root: HastRoot,
  max = 160,
): string | null {
  // First line of a paragraph: with remark-breaks a "***Draft:*** 1.0 /
  // ***Author:*** …" block is one paragraph, and only its first line reads.
  const firstLine = (p: Element): string => {
    const i = p.children.findIndex((c) => c.type === "element" && c.tagName === "br");
    const kids = i === -1 ? p.children : p.children.slice(0, i);
    return hastToString({ ...p, children: kids }).replace(/\s+/g, " ").trim();
  };
  // A "Label: value" line (Draft: 1.0, Author: …, Created: …) is metadata,
  // not a summary. Prefer the first paragraph that reads as prose.
  const looksLikeLabel = (t: string) => /^[A-Za-z][A-Za-z0-9 /&()'’-]{0,40}:\s*\S/.test(t);
  const paragraphs = elementsOf(root).filter(isParagraph);
  if (paragraphs.length === 0) return null;
  const clip = (text: string) =>
    text.length <= max ? text : text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  for (const p of paragraphs) {
    const text = firstLine(p);
    if (text.length >= 40 && !looksLikeLabel(text)) return clip(text);
  }
  const fallback = firstLine(paragraphs[0]);
  return fallback ? clip(fallback) : null;
}

/** H2–H4 with their ids, in document order, for the contents pane. */
export function tocFromTree(root: HastRoot): TocEntry[] {
  const out: TocEntry[] = [];
  const walk = (nodes: RootContent[]) => {
    for (const node of nodes) {
      if (node.type !== "element") continue;
      const depth = /^h([2-4])$/.exec(node.tagName)?.[1];
      const id = String(node.properties?.id ?? "");
      if (depth && id) {
        const text = hastToString(node).replace(/\s+/g, " ").trim();
        if (text) out.push({ depth: Number(depth), id, text });
      }
      walk(node.children as RootContent[]);
    }
  };
  walk(elementsOf(root));
  return out;
}

export async function inferTitle(markdown: string): Promise<string | null> {
  return inferTitleFromTree(await toTree(markdown));
}

/**
 * Render for the reader. The first H1 is lifted out as the title (the page
 * header displays it), and the body is split at every H2 so each section is
 * its own element for print breaks. Each section keeps its own H2 — the
 * heading is part of the prose, not a rail label.
 */
export async function renderDocument(markdown: string): Promise<RenderedDocument> {
  const root = await toTree(markdown);
  const nodes = elementsOf(root);
  const title = inferTitleFromTree(root);
  const description = inferDescriptionFromTree(root);

  // Drop the first H1 (it becomes the page title) — only the first, so a
  // later H1 still renders inside the body.
  const firstH1 = nodes.findIndex(isH1);
  const body = firstH1 === -1 ? nodes : nodes.filter((_, i) => i !== firstH1);

  const sections: RenderedSection[] = [];
  let current: RootContent[] = [];
  let heading: Element | null = null;

  const flush = () => {
    // Skip an empty lede; keep an empty section (its heading matters).
    if (!heading && current.every((n) => n.type === "text")) return;
    sections.push({
      heading: heading ? hastToString(heading).trim() : null,
      id: heading ? String(heading.properties?.id ?? "") || null : null,
      html: stringify(heading ? [heading, ...current] : current),
    });
  };

  for (const node of body) {
    if (isH2(node)) {
      flush();
      heading = node;
      current = [];
    } else {
      current.push(node);
    }
  }
  flush();

  return { title, description, sections, toc: tocFromTree({ ...root, children: body }) };
}

/** Whole document as one sanitized HTML string (used by tests and previews). */
export async function renderHtml(markdown: string): Promise<string> {
  const root = await toTree(markdown);
  return stringify(elementsOf(root));
}

/** The reader's own parse-and-sanitize, for the diff renderer to decorate. */
export async function toSanitizedTree(markdown: string): Promise<HastRoot> {
  return toTree(markdown);
}

/**
 * Stringify nodes the diff renderer has decorated, through rehype-sanitize
 * once more. The document's markup was filtered on the way in; this pass is
 * about the wrappers the diff adds afterwards — nothing it emits reaches a
 * reader unfiltered, and no HTML is ever assembled by string surgery.
 */
export function stringifyDecorated(nodes: RootContent[]): string {
  const clean = decorator.runSync({ type: "root", children: nodes }) as HastRoot;
  return stringifier.stringify(clean);
}

/** A plain-`<p>` stand-in for a block the renderer drops (raw HTML, say), so
 *  a change to one is still visible instead of silently empty. */
export function stringifyPlainBlock(text: string): string {
  return stringifyDecorated([
    {
      type: "element",
      tagName: "p",
      properties: { className: ["share-diff-plain"] },
      children: [{ type: "text", value: text }],
    },
  ]);
}
