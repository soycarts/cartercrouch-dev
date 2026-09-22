import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentDiff, isEmptyDiff, renderedDiff, sourceHunks, wordMarks } from "../diff";
import { renderDocument, splitBlocks, stringifyDecorated, topLevelBlocks } from "../markdown";

const ROOT = path.resolve(__dirname, "../../../..");
const fixture = (name: string) => readFileSync(path.join(ROOT, "fixtures", name), "utf8");

/** Every line of a hunk, flattened, for the assertions that only care about
 *  what changed rather than where. */
const flat = (hunks: ReturnType<typeof sourceHunks>) =>
  hunks.flatMap((h) => h.lines.map((l) => `${l.kind[0]} ${l.text}`));

const BASE = [
  "# Doc",
  "",
  "One.",
  "",
  "Two.",
  "",
  "Three.",
  "",
  "Four.",
  "",
  "Five.",
  "",
  "Six.",
  "",
].join("\n");

describe("source hunks", () => {
  it("shows an insertion with context on both sides", () => {
    const hunks = sourceHunks(BASE, BASE.replace("Three.", "Three.\n\nInserted."));
    expect(hunks).toHaveLength(1);
    expect(flat(hunks)).toContain("a Inserted.");
    // Three lines of context each side, and nothing else marked.
    expect(flat(hunks).filter((l) => l.startsWith("a "))).toHaveLength(2); // the line and its blank
    expect(flat(hunks).filter((l) => l.startsWith("d "))).toHaveLength(0);
  });

  it("shows a deletion", () => {
    const hunks = sourceHunks(BASE, BASE.replace("Four.\n\n", ""));
    expect(flat(hunks)).toContain("d Four.");
    expect(flat(hunks).filter((l) => l.startsWith("a "))).toHaveLength(0);
  });

  it("marks the changed words of a replaced line", () => {
    const hunks = sourceHunks(
      "The quick brown fox jumps over the lazy dog.\n",
      "The quick red fox leaps over the lazy dog.\n",
    );
    const [del, add] = hunks[0].lines.filter((l) => l.kind !== "context");
    expect(del.kind).toBe("del");
    expect(add.kind).toBe("add");
    expect(del.marks!.map((m) => del.text.slice(m.start, m.end))).toEqual(["brown", "jumps"]);
    expect(add.marks!.map((m) => add.text.slice(m.start, m.end))).toEqual(["red", "leaps"]);
  });

  it("leaves a wholly rewritten line unmarked rather than marking all of it", () => {
    const hunks = sourceHunks("Alpha beta gamma.\n", "Something else entirely here.\n");
    for (const line of hunks[0].lines) expect(line.marks).toBeUndefined();
  });

  it("counts the unchanged lines it is not showing", () => {
    const long = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n");
    const hunks = sourceHunks(long, long.replace("line 0", "first").replace("line 30", "last"));
    expect(hunks).toHaveLength(2);
    // Nothing is skipped before the first hunk; the gap between the two is.
    expect(hunks[0].skipped).toBe(0);
    expect(hunks[1].skipped).toBeGreaterThan(0);
    // Exactly the lines between the end of the first hunk and the start of
    // the second, counted from the first hunk's own extent.
    const firstOldLines = hunks[0].lines.filter((l) => l.kind !== "add").length;
    expect(hunks[1].skipped).toBe(hunks[1].oldStart - (hunks[0].oldStart + firstOldLines));
  });

  it("has nothing to say about two identical documents", () => {
    expect(sourceHunks(BASE, BASE)).toEqual([]);
  });

  it("does not read a CRLF document as a whole-file rewrite", () => {
    expect(sourceHunks(BASE.replace(/\n/g, "\r\n"), BASE)).toEqual([]);
  });

  it("drops jsdiff's no-newline marker instead of showing it as a line", () => {
    const hunks = sourceHunks("x\ny", "x\nz");
    expect(flat(hunks)).toEqual(["c x", "d y", "a z"]);
  });
});

describe("word marks", () => {
  it("returns offsets that slice back out of the originals", () => {
    const marks = wordMarks("alpha beta gamma", "alpha delta gamma")!;
    expect(marks.del.map((m) => "alpha beta gamma".slice(m.start, m.end))).toEqual(["beta"]);
    expect(marks.add.map((m) => "alpha delta gamma".slice(m.start, m.end))).toEqual(["delta"]);
  });

  it("gives up when the two lines share almost nothing", () => {
    expect(wordMarks("alpha beta gamma delta", "nothing whatsoever alike")).toBeNull();
  });

  it("gives up on an empty side", () => {
    expect(wordMarks("", "something")).toBeNull();
  });
});

describe("the rendered diff", () => {
  const doc = (body: string) => `# Doc\n\nLede.\n\n${body}\n`;

  it("marks a changed heading on both sides", async () => {
    const { blocks, stats } = await renderedDiff(doc("## Section one"), doc("## Section two"));
    const del = blocks.find((b) => b.kind === "del")!;
    const add = blocks.find((b) => b.kind === "add")!;
    expect(del.html).toContain('<del class="share-diff-del">one</del>');
    expect(add.html).toContain('<mark class="share-diff-ins">two</mark>');
    expect(stats).toEqual({ added: 0, removed: 0, changed: 1 });
  });

  it("marks the changed words of an edited paragraph", async () => {
    const { blocks } = await renderedDiff(
      doc("The quick brown fox jumps over it."),
      doc("The quick red fox jumps over it."),
    );
    expect(blocks.find((b) => b.kind === "del")!.html).toContain(
      '<del class="share-diff-del">brown</del>',
    );
    expect(blocks.find((b) => b.kind === "add")!.html).toContain(
      '<mark class="share-diff-ins">red</mark>',
    );
  });

  it("marks a word that spans an inline element's boundary", async () => {
    // "**one** two" → "**one** three": the mark must land inside the
    // paragraph's own text node, not swallow the <strong> beside it.
    const { blocks } = await renderedDiff(doc("**one** two"), doc("**one** three"));
    const add = blocks.find((b) => b.kind === "add")!;
    expect(add.html).toContain("<strong>one</strong>");
    expect(add.html).toContain('<mark class="share-diff-ins">three</mark>');
    // One mark, and it does not swallow the <strong> beside it.
    expect(add.html.match(/<mark/g)).toHaveLength(1);
    expect(add.html).not.toContain("<mark class=\"share-diff-ins\"><strong>");
  });

  it("counts one added list item as one added block", async () => {
    const { blocks, stats } = await renderedDiff(
      doc("- one\n- two"),
      doc("- one\n- two\n- three"),
    );
    expect(stats).toEqual({ added: 1, removed: 0, changed: 0 });
    const add = blocks.find((b) => b.kind === "add")!;
    expect(add.html).toContain("three");
    expect(add.html).not.toContain("one");
  });

  it("shows a changed table whole, with no word marks inside it", async () => {
    const table = (cell: string) => doc(`| a | b |\n|---|---|\n| 1 | ${cell} |`);
    const { blocks, stats } = await renderedDiff(table("2"), table("9"));
    expect(stats).toEqual({ added: 0, removed: 0, changed: 1 });
    const del = blocks.find((b) => b.kind === "del")!;
    const add = blocks.find((b) => b.kind === "add")!;
    expect(del.html).toContain("<table>");
    expect(add.html).toContain("<table>");
    expect(del.html).not.toContain("share-diff-del");
    expect(add.html).not.toContain("share-diff-ins");
    // The whole table on each side, header row included.
    expect(add.html).toContain("<th>a</th>");
  });

  it("shows a changed code fence whole, with no word marks inside it", async () => {
    const fence = (value: string) => doc("```ts\nconst x = " + value + ";\n```");
    const { blocks, stats } = await renderedDiff(fence("1"), fence("2"));
    expect(stats).toEqual({ added: 0, removed: 0, changed: 1 });
    const add = blocks.find((b) => b.kind === "add")!;
    expect(add.html).toContain('<code class="language-ts">');
    expect(add.html).toContain("const x = 2;");
    expect(add.html).not.toContain("share-diff-ins");
  });

  it("does not pair a removed table with an added paragraph", async () => {
    const { stats } = await renderedDiff(
      doc("| a | b |\n|---|---|\n| 1 | 2 |"),
      doc("A paragraph instead."),
    );
    expect(stats).toEqual({ added: 1, removed: 1, changed: 0 });
  });

  it("collapses a long unchanged run to its ends and a count", async () => {
    const body = Array.from({ length: 12 }, (_, i) => `Paragraph ${i}.`).join("\n\n");
    const { blocks } = await renderedDiff(doc(body), doc(`${body}\n\nAdded at the end.`));
    const collapsed = blocks.filter((b) => b.kind === "collapsed");
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].kind === "collapsed" && collapsed[0].count).toBeGreaterThan(5);
    // First and last block of the run survive as context.
    expect(blocks.filter((b) => b.kind === "equal")).toHaveLength(2);
    expect(blocks.some((b) => b.kind === "add" && b.html.includes("Added at the end"))).toBe(true);
  });

  it("keeps a short unchanged run whole rather than collapsing it", async () => {
    const { blocks } = await renderedDiff(doc("One."), doc("One.\n\nTwo."));
    expect(blocks.filter((b) => b.kind === "collapsed")).toHaveLength(0);
  });

  it("shows a block the renderer drops as its own source", async () => {
    const { blocks } = await renderedDiff(
      doc('<div class="raw">gone</div>'),
      doc('<div class="raw">changed</div>'),
    );
    const add = blocks.find((b) => b.kind === "add")!;
    expect(add.html).toContain("share-diff-plain");
    expect(add.html).toContain("&#x3C;div"); // shown as text, not as markup
    expect(add.html).not.toContain("<div class=\"raw\">");
  });

  it("gives every block of a removed file the removed side", async () => {
    const { blocks, stats } = await renderedDiff("# Gone\n\nBody.\n", "");
    expect(blocks.every((b) => b.kind === "del")).toBe(true);
    expect(stats).toEqual({ added: 0, removed: 2, changed: 0 });
  });
});

describe("the diff's HTML", () => {
  // The reader's own pipeline drops raw HTML and filters the tree; the diff
  // decorates that tree afterwards and sanitizes again. Both passes are
  // asserted here because the diff renders block by block, which is a path
  // the reader's own tests never take.
  const nasty = [
    "# T",
    "",
    '<script>alert(1)</script>',
    "",
    '<img src=x onerror="alert(1)">',
    "",
    "[x](javascript:alert(1))",
    "",
    'ok <b onclick="x()">bold</b>',
    "",
  ].join("\n");

  it("carries nothing executable through either mode", async () => {
    const { blocks } = await renderedDiff(nasty, nasty.replace("# T", "# T2"));
    const html = blocks.map((b) => b.html).join("\n");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
  });

  it("does not prefix ids twice, and drops them from diff blocks", async () => {
    const { blocks } = await renderedDiff("## Heading one\n", "## Heading two\n");
    const html = blocks.map((b) => b.html).join("\n");
    expect(html).not.toContain("user-content-user-content-");
    expect(html).not.toContain("id=");
  });

  it("keeps the table wrapper the reader puts around a table", async () => {
    const { blocks } = await renderedDiff(
      "| a |\n|---|\n| 1 |\n",
      "| a |\n|---|\n| 2 |\n",
    );
    expect(blocks.find((b) => b.kind === "add")!.html).toContain('<div class="table-scroll">');
  });
});

describe("documentDiff", () => {
  it("is empty for two identical drafts", async () => {
    const diff = await documentDiff({ archived: BASE, live: BASE, liveLabel: "1.1" });
    expect(isEmptyDiff(diff)).toBe(true);
    expect(diff.note).toBeNull();
    expect(diff.liveLabel).toBe("1.1");
  });

  it("says so when the file is not in the current draft", async () => {
    const diff = await documentDiff({ archived: "# Spec\n\nBody.\n", live: null, liveLabel: "1.1" });
    expect(diff.note).toBe("This file is not in the current draft.");
    expect(isEmptyDiff(diff)).toBe(false);
    // The whole file, as removed, in both representations.
    expect(diff.source).toHaveLength(1);
    expect(diff.source[0].lines.every((l) => l.kind === "del")).toBe(true);
    expect(diff.rendered.every((b) => b.kind === "del")).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   The splitter against the renderer.

   The diff is only as good as its block boundaries: a block that straddles
   one of the renderer's own blocks would render as something the document
   never contained. `topLevelBlocks` reads those boundaries off the mdast, so
   this compares the splitter with the parser rather than with a second
   opinion.

   Two invariants, both directions of "agree":

   - every boundary the renderer draws is one the splitter draws;
   - every block the splitter produces lies inside one renderer block.

   The splitter is deliberately finer — a list item rather than a list — so
   the counts do not match, and the test states the relationship instead.

   SHARE_DIFF_FIXTURES runs the same checks over extra documents: the real
   50 KB bundle files were checked this way, and the two constructs they
   turned up (a table indented inside a list item, tab-indented numbering)
   are in share-blocks.md so the suite keeps testing them.
   --------------------------------------------------------------------------- */
describe("block boundaries agree with the renderer's", () => {
  const extra = (process.env.SHARE_DIFF_FIXTURES ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((file) => [file, readFileSync(file, "utf8")] as const);

  const documents: ReadonlyArray<readonly [string, string]> = [
    ["share-sample.md", fixture("share-sample.md")],
    ["share-blocks.md", fixture("share-blocks.md")],
    ...extra,
  ];

  for (const [name, markdown] of documents) {
    it(`holds on ${name}`, async () => {
      const blocks = splitBlocks(markdown);
      const top = topLevelBlocks(markdown);
      expect(blocks.length).toBeGreaterThan(0);

      const starts = new Set(blocks.map((b) => b.startLine));
      expect(top.filter((t) => !starts.has(t.startLine))).toEqual([]);

      const straddling = blocks.filter((b) => {
        const owner = top.find((t) => b.startLine >= t.startLine && b.startLine <= t.endLine);
        return !owner || b.endLine > owner.endLine;
      });
      expect(straddling).toEqual([]);

      // Finer, never coarser.
      expect(blocks.length).toBeGreaterThanOrEqual(top.length);

      // And the renderer's own section split — which is the boundary the
      // reader sees — never falls inside a block either.
      const { sections } = await renderDocument(markdown);
      expect(sections.length).toBeGreaterThan(0);
      const headings = blocks.filter((b) => b.kind === "heading");
      const h2s = sections.filter((s) => s.heading !== null);
      expect(headings.length).toBeGreaterThanOrEqual(h2s.length);
    });
  }
});

/* ---------------------------------------------------------------------------
   Regressions found by the adversarial review of this branch. Each test is
   the reproduction first, the fix second.
   --------------------------------------------------------------------------- */

describe("F10: the source file is text", () => {
  it("has no control bytes in diff.ts", () => {
    const source = readFileSync(path.join(ROOT, "src/lib/share/diff.ts"));
    const control = [...source].filter((b) => b < 9 || (b > 13 && b < 32));
    expect(control).toEqual([]);
  });
});

describe("F11: the second sanitizer pass names its class values", () => {
  it("keeps the four the diff emits and drops anything else", async () => {
    // Straight at the seam: a tree carrying class names the diff never
    // emits, through the same stringifier the rendered diff uses.
    const html = stringifyDecorated([
      {
        type: "element",
        tagName: "p",
        properties: { className: ["share-diff-plain", "absolute", "inset-0"] },
        children: [{ type: "text", value: "text" }],
      },
      {
        type: "element",
        tagName: "mark",
        properties: { className: ["share-diff-ins", "fixed"] },
        children: [{ type: "text", value: "word" }],
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll", "opacity-0"] },
        children: [],
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["anything"] },
        children: [{ type: "text", value: "span" }],
      },
    ]);
    expect(html).toBe(
      '<p class="share-diff-plain">text</p>' +
        '<mark class="share-diff-ins">word</mark>' +
        '<div class="table-scroll"></div>' +
        "<span>span</span>",
    );
  });

  it("emits no class the schema does not name", async () => {
    const { blocks } = await renderedDiff("| a |\n|---|\n| 1 |\n", "| a |\n|---|\n| 2 |\n");
    const classes = new Set(
      [...blocks.map((b) => b.html).join("\n").matchAll(/class="([^"]*)"/g)].map((m) => m[1]),
    );
    expect([...classes]).toEqual(["table-scroll"]);
  });
});

describe("F1: line endings are not a change", () => {
  // The document the refuter used: a setext heading, whose underline the
  // block splitter only recognises when the line has no trailing CR, and a
  // lazy-continuation list that exercises closeListsAtLazyLines.
  const LF = [
    "# Title",
    "",
    "A setext heading",
    "----------------",
    "",
    "Timour:",
    "* Sign-off on the definitions",
    "Seref:",
    "* Thresholds",
    "",
    "A paragraph that is unchanged, the first of several.",
    "",
    "Second unchanged paragraph.",
    "",
    "Third unchanged paragraph.",
    "",
  ].join("\n");
  const CRLF = LF.replace(/\n/g, "\r\n");
  const CR = LF.replace(/\n/g, "\r");

  it("splits the same blocks whatever the line endings", () => {
    const lf = splitBlocks(LF);
    for (const [name, variant] of [["CRLF", CRLF], ["CR", CR]] as const) {
      const got = splitBlocks(variant);
      expect(got.map((b) => `${b.kind}[${b.startLine}-${b.endLine}]`), name).toEqual(
        lf.map((b) => `${b.kind}[${b.startLine}-${b.endLine}]`),
      );
    }
  });

  for (const [name, archived, live] of [
    ["CRLF vs LF", CRLF, LF],
    ["LF vs CRLF", LF, CRLF],
    ["CR vs LF", CR, LF],
    ["CRLF vs CR", CRLF, CR],
  ] as const) {
    it(`reports no change for ${name} of identical text`, async () => {
      const rendered = await renderedDiff(archived, live);
      expect(rendered.stats).toEqual({ added: 0, removed: 0, changed: 0 });
      expect(rendered.blocks.every((b) => b.kind === "equal" || b.kind === "collapsed")).toBe(true);

      const diff = await documentDiff({ archived, live, liveLabel: "1.1" });
      expect(isEmptyDiff(diff)).toBe(true);
    });
  }

  it("still finds the real change in two CRLF drafts", async () => {
    const edited = CRLF.replace("Sign-off on the definitions", "Sign-off on the metrics");
    const diff = await documentDiff({ archived: CRLF, live: edited, liveLabel: "1.1" });
    expect(diff.stats).toEqual({ added: 0, removed: 0, changed: 1 });
    expect(diff.source).toHaveLength(1);
    expect(
      diff.rendered.find((b) => b.kind === "add")!.html,
    ).toContain('<mark class="share-diff-ins">metrics</mark>');
  });

  it("the two modes never disagree about whether anything changed", async () => {
    for (const [archived, live] of [
      [CRLF, LF],
      [CR, LF],
      [CRLF, CRLF.replace("Thresholds", "Threshold policy")],
    ] as const) {
      const diff = await documentDiff({ archived, live, liveLabel: "1.1" });
      const blocksChanged =
        diff.stats.added + diff.stats.removed + diff.stats.changed > 0;
      expect(diff.source.length > 0).toBe(blocksChanged);
    }
  });
});
