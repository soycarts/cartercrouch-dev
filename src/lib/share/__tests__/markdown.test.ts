import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  inferTitle,
  renderDocument,
  renderHtml,
  stringifyDecorated,
  toSanitizedTree,
} from "../markdown";

describe("markdown rendering", () => {
  it("drops raw HTML and scripts", async () => {
    const html = await renderHtml(
      '# T\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\nok <b onclick="x()">bold</b>\n',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).toContain("ok");
  });

  it("neutralises javascript: links", async () => {
    const html = await renderHtml("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("supports GFM tables, code, and task lists", async () => {
    const html = await renderHtml(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n- [x] done\n",
    );
    expect(html).toContain("<table>");
    expect(html).toContain('<code class="language-ts">');
    expect(html).toContain('type="checkbox"');
  });

  it("wraps every table in a scroll container", async () => {
    const html = await renderHtml("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain('<div class="table-scroll"><table>');
    expect(html).toContain("</table></div>");
  });

  it("ends the list at a lazy continuation line, as Obsidian does", async () => {
    const html = await renderHtml(
      [
        "Timour:",
        "* Sign-off on the definitions",
        "* Proactive limit: three per day?",
        "Seref:",
        "* Thresholds for the budgets and alerts.",
        "NYU:",
        "* The MoralMod harness, or a date for it.",
        "",
      ].join("\n"),
    );
    // Three lists, each closed by the paragraph that follows it.
    expect(html.match(/<ul>/g)).toHaveLength(3);
    expect(html).toContain("<p>Seref:</p>");
    expect(html).toContain("<p>NYU:</p>");
    // Neither name may have been swallowed by the item above it, which is
    // how it used to render: a <br> and a second line inside the bullet.
    expect(html).not.toMatch(/<li>(?:(?!<\/li>)[\s\S])*Seref/);
    expect(html).not.toMatch(/<li>(?:(?!<\/li>)[\s\S])*NYU/);
    expect(html.indexOf("<p>Seref:</p>")).toBeGreaterThan(html.indexOf("</ul>"));
  });

  it("keeps an indented continuation inside its own list item", async () => {
    const html = await renderHtml("* First line\n  second line of the same item\n");
    expect(html.match(/<li>/g)).toHaveLength(1);
    expect(html).toContain("second line of the same item");
    expect(html).not.toContain("<p>second line");
  });

  it("leaves a nested list alone, and still closes at column one", async () => {
    const inner = await renderHtml("* Outer\n  * Inner\n  still the inner list's item\n");
    expect(inner.match(/<ul>/g)).toHaveLength(2);
    expect(inner).not.toContain("<p>still");

    const closed = await renderHtml("* Outer\n  * Inner\nback at column one\n* Fresh\n");
    expect(closed).toContain("<p>back at column one</p>");
    expect(closed.match(/<ul>/g)).toHaveLength(3);
  });

  it("does not split a lazy-looking line inside a fenced code block", async () => {
    const html = await renderHtml("* Item\n\n```\n* fenced\nnot lazy\n```\n");
    expect(html).toContain("* fenced\nnot lazy");
  });

  it("turns a single newline into a line break, as Obsidian does", async () => {
    const html = await renderHtml("***Draft:*** 1.0\n***Author:*** Carter Crouch\n");
    expect(html).toContain("<br>");
    expect(html.match(/<p>/g)).toHaveLength(1);
  });

  it("leaves tables and code blocks alone when breaking lines", async () => {
    const html = await renderHtml(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\nconst y = 2;\n```\n",
    );
    expect(html).toContain("<table>");
    expect(html.slice(html.indexOf("<table>"), html.indexOf("</table>"))).not.toContain("<br>");
    expect(html.slice(html.indexOf("<pre>"))).not.toContain("<br>");
    expect(html).toContain("const x = 1;\nconst y = 2;");
  });

  it("infers the title from the first H1", async () => {
    expect(await inferTitle("# Hello *world*\n\ntext")).toBe("Hello world");
    expect(await inferTitle("no heading")).toBeNull();
    expect(await inferTitle("## Only H2")).toBeNull();
  });

  it("splits sections at H2, keeps their headings, and lifts the H1", async () => {
    const doc = await renderDocument(
      "# Title\n\nLede paragraph.\n\n## First\n\nA.\n\n## Second Heading\n\nB.\n",
    );
    expect(doc.title).toBe("Title");
    expect(doc.description).toBe("Lede paragraph.");
    expect(doc.sections).toHaveLength(3);
    expect(doc.sections.map((s) => s.heading)).toEqual([null, "First", "Second Heading"]);
    expect(doc.sections[2].id).toBe("user-content-second-heading");
    expect(doc.sections[0].html).toContain("Lede paragraph.");
    expect(doc.sections[0].html).not.toContain("<h1");
    expect(doc.sections[2].html).toContain('<h2 id="user-content-second-heading">');
    expect(doc.sections[2].html).toContain("<p>B.</p>");
  });

  it("builds a nested table of contents from H2–H4", async () => {
    const doc = await renderDocument(
      "# Title\n\n## One\n\n### One A\n\n#### Deep\n\n##### Too deep\n\n## Two\n",
    );
    expect(doc.toc).toEqual([
      { depth: 2, id: "user-content-one", text: "One" },
      { depth: 3, id: "user-content-one-a", text: "One A" },
      { depth: 4, id: "user-content-deep", text: "Deep" },
      { depth: 2, id: "user-content-two", text: "Two" },
    ]);
  });

  it("describes only the first line of a broken lede", async () => {
    const doc = await renderDocument("# T\n\n***Draft:*** 1.0\n***Author:*** Carter\n");
    expect(doc.description).toBe("Draft: 1.0");
  });

  it("clips long descriptions on a word boundary", async () => {
    const long = "word ".repeat(60).trim();
    const doc = await renderDocument(`# T\n\n${long}`);
    expect(doc.description!.length).toBeLessThanOrEqual(160);
    expect(doc.description!.endsWith("…")).toBe(true);
  });
});


describe("description skips metadata lines", () => {
  it("prefers the first prose paragraph over a Label: value block", async () => {
    const md = [
      "# Title",
      "***Draft:*** 1.0",
      "***Author:*** Carter Crouch",
      "",
      "### Scope",
      "My background is data science and data engineering, alongside recent work orchestrating agents.",
    ].join("\n");
    const { description } = await renderDocument(md);
    expect(description).toMatch(/^My background is data science/);
  });
  it("falls back to the first line when nothing reads as prose", async () => {
    const { description } = await renderDocument("# T\n***Draft:*** 1.0\n***Author:*** X");
    expect(description).toBe("Draft: 1.0");
  });
});

/** Every id in the HTML, and every in-document link target in it. */
const idsOf = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const hashTargetsOf = (html: string) => [...html.matchAll(/\shref="#([^"]+)"/g)].map((m) => m[1]);
const decoded = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
/**
 * The targets no element in the HTML carries. Like a browser, match the raw
 * fragment first, then the percent-decoded one: heading links are encoded
 * against a raw id, footnote links and ids are encoded on both sides.
 */
const deadLinks = (html: string) => {
  const ids = idsOf(html);
  return hashTargetsOf(html).filter((target) => !ids.has(target) && !ids.has(decoded(target)));
};

describe("in-document links and footnotes", () => {
  it("points a hand-written anchor link at the prefixed heading id", async () => {
    const html = await renderHtml("## Later On\n\nSee [below](#later-on).\n");
    expect(html).toContain('<h2 id="user-content-later-on">');
    expect(html).toContain('<a href="#user-content-later-on">below</a>');
    expect(deadLinks(html)).toEqual([]);
  });

  it("links a footnote reference to its note and back again", async () => {
    const html = await renderHtml("A claim.[^1]\n\n[^1]: The note.\n");
    // One prefix, not the two remark-rehype and rehype-sanitize used to stack.
    expect(html).not.toContain("user-content-user-content-");
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).toContain('href="#user-content-fnref-1"');
    expect(html).toContain('id="user-content-fnref-1"');
    expect(html).toContain('aria-describedby="user-content-footnote-label"');
    expect(html).toContain('id="user-content-footnote-label"');
    expect(deadLinks(html)).toEqual([]);
  });

  it("leaves external fragments, a bare #, and already-prefixed links alone", async () => {
    const html = await renderHtml(
      "## Top\n\n[ext](https://example.com/a#b) [bare](#) [copied](#user-content-top)\n",
    );
    expect(html).toContain('href="https://example.com/a#b"');
    expect(html).toContain('href="#"');
    expect(html).toContain('href="#user-content-top"');
    expect(html).not.toContain("#user-content-user-content-");
  });

  it("leaves [Back to top](#top) as #top when no element has that id", async () => {
    // Browsers scroll to the top for #top when nothing carries the id; a
    // prefixed #user-content-top would match nothing and do nothing.
    const html = await renderHtml("## One\n\ntext\n\n[Back to top](#top) [gone](#missing)\n");
    expect(html).toContain('<a href="#top">Back to top</a>');
    expect(html).toContain('<a href="#missing">gone</a>');
    expect(html).not.toContain("#user-content-top");
    expect(html).not.toContain("#user-content-missing");
  });

  it("links a heading whose own slug starts with user-content-", async () => {
    const html = await renderHtml("## User content intro\n\n[x](#user-content-intro)\n");
    expect(html).toContain('id="user-content-user-content-intro"');
    expect(html).toContain('href="#user-content-user-content-intro"');
    expect(deadLinks(html)).toEqual([]);
  });

  it("leaves a link that already resolves as written", async () => {
    const html = await renderHtml(
      "## Intro\n\n## User content intro\n\n[copied](#user-content-intro)\n",
    );
    expect(html).toContain('<a href="#user-content-intro">copied</a>');
    expect(deadLinks(html)).toEqual([]);
  });

  it("links a non-ASCII footnote to its note and back again", async () => {
    const html = await renderHtml("A claim.[^café]\n\n[^café]: The note.\n");
    expect(html).not.toContain("user-content-user-content-");
    expect(html).toContain('href="#user-content-fn-caf%C3%A9"');
    expect(html).toContain('id="user-content-fn-caf%C3%A9"');
    expect(html).toContain('href="#user-content-fnref-caf%C3%A9"');
    expect(html).toContain('id="user-content-fnref-caf%C3%A9"');
    expect(deadLinks(html)).toEqual([]);
  });

  it("links a non-ASCII heading through its percent-encoded href", async () => {
    const html = await renderHtml("## Café Société\n\n[go](#café-société)\n");
    expect(html).toContain('id="user-content-café-société"');
    expect(html).toContain('href="#user-content-caf%C3%A9-soci%C3%A9t%C3%A9"');
    expect(deadLinks(html)).toEqual([]);
  });

  it("keeps the hidden Footnotes heading out of the contents", async () => {
    const doc = await renderDocument("# T\n\n## One\n\nA note.[^a]\n\n## Two\n\n[^a]: Text.\n");
    expect(doc.toc).toEqual([
      { depth: 2, id: "user-content-one", text: "One" },
      { depth: 2, id: "user-content-two", text: "Two" },
    ]);
    // The heading is still rendered, for screen readers, inside the last section.
    expect(doc.sections.at(-1)!.html).toContain('<h2 class="sr-only" id="user-content-footnote-label">');
  });

  it("keeps links and ids intact through the diff's second sanitize pass", async () => {
    const tree = await toSanitizedTree("## Later On\n\nSee [below](#later-on), a note.[^1]\n\n[^1]: Text.\n");
    const html = stringifyDecorated(tree.children);
    expect(html).not.toContain("user-content-user-content-");
    expect(html).toContain('href="#user-content-later-on"');
    expect(deadLinks(html)).toEqual([]);
  });
});

describe("the wide-table fixture", () => {
  const ROOT = path.resolve(__dirname, "../../../..");
  const markdown = readFileSync(path.join(ROOT, "fixtures", "share-wide.md"), "utf8");

  it("resolves every in-document link and footnote across the sections", async () => {
    const doc = await renderDocument(markdown);
    const html = doc.sections.map((s) => s.html).join("\n");
    const targets = hashTargetsOf(html);
    // Five hand-written anchors, two footnote refs, two back-references.
    expect(targets.length).toBeGreaterThanOrEqual(9);
    expect(deadLinks(html)).toEqual([]);
    expect(html).toContain('href="https://example.com/page#section"');
  });

  it("wraps both wide tables in scroll boxes", async () => {
    const html = await renderHtml(markdown);
    expect(html.match(/<div class="table-scroll"><table>/g)).toHaveLength(2);
  });

  it("builds contents whose every target exists, without Footnotes", async () => {
    const doc = await renderDocument(markdown);
    const ids = idsOf(doc.sections.map((s) => s.html).join("\n"));
    expect(doc.toc.map((t) => t.text)).toEqual([
      "Ten columns",
      "Seven columns",
      "A third-level heading",
      "A fourth-level heading",
      "Closing notes",
    ]);
    expect(doc.toc.filter((t) => !ids.has(t.id))).toEqual([]);
  });
});
