import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeSanitize, schema);

const stringifier = unified().use(rehypeStringify);

export type RenderedSection = {
  /** Section number, 1-based, or null for the lede before the first H2. */
  number: number | null;
  /** Plain-text heading of the H2 that opened this section. */
  heading: string | null;
  /** The H2's id attribute, for anchors. */
  id: string | null;
  /** Sanitized HTML for the section body (heading excluded). */
  html: string;
};

export type RenderedDocument = {
  title: string | null;
  description: string | null;
  sections: RenderedSection[];
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
  const tree = await processor.run(processor.parse(markdown));
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
  const p = elementsOf(root).find(isParagraph);
  if (!p) return null;
  const text = hastToString(p).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export async function inferTitle(markdown: string): Promise<string | null> {
  return inferTitleFromTree(await toTree(markdown));
}

/**
 * Render for the reader. The first H1 is lifted out as the title (the page
 * header displays it), and the body is split at every H2 so each section
 * can carry a numbered rail label.
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
  let count = 0;

  const flush = () => {
    // Skip an empty lede; keep an empty numbered section (its heading matters).
    if (!heading && current.every((n) => n.type === "text")) return;
    sections.push({
      number: heading ? count : null,
      heading: heading ? hastToString(heading).trim() : null,
      id: heading ? String(heading.properties?.id ?? "") || null : null,
      html: stringify(current),
    });
  };

  for (const node of body) {
    if (isH2(node)) {
      flush();
      heading = node;
      count += 1;
      current = [];
    } else {
      current.push(node);
    }
  }
  flush();

  return { title, description, sections };
}

/** Whole document as one sanitized HTML string (used by tests and previews). */
export async function renderHtml(markdown: string): Promise<string> {
  const root = await toTree(markdown);
  return stringify(elementsOf(root));
}
