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
