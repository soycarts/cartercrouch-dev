import { diffArrays, diffWordsWithSpace, structuredPatch } from "diff";
import type { Element, RootContent } from "hast";
import {
  closeListsAtLazyLines,
  normaliseLineEndings,
  renderHtml,
  splitBlocks,
  stringifyDecorated,
  stringifyPlainBlock,
  toSanitizedTree,
  type SourceBlock,
} from "./markdown";

/**
 * "Diff vs live": what an archived draft has that the current one does not,
 * and the other way round. Direction is archived → live throughout, so a
 * removal is what the draft being read says and an addition is what the
 * current draft says instead.
 *
 * Two representations, one per reading mode:
 *
 * - `source` — git-style hunks for the Markdown mode, lines with three
 *   lines of context and, on a replaced line, the changed words marked.
 * - `rendered` — the same change block by block for the Reader mode, each
 *   block's own sanitized HTML, with runs of unchanged blocks collapsed.
 *
 * Both are computed on the server, once per request, from two strings the
 * page already holds: an archived reader page loads the snapshot *and* the
 * current document anyway (see `loadShareView`), so the diff costs no fetch.
 */

/** A half-open range of character offsets into a line or a block's text. */
export type Run = { start: number; end: number };

/** `note` is jsdiff's "\\ No newline at end of file", which is part of the
 *  patch and says something a reader needs: the file does not end in a
 *  newline. It is kept, not dropped. */
export type HunkLineKind = "context" | "del" | "add" | "note";

export type HunkLine = {
  kind: HunkLineKind;
  text: string;
  /** Set on a replaced line: which words differ from the line it replaces. */
  marks?: Run[];
};

export type Hunk = {
  /** 1-based line in the archived draft. */
  oldStart: number;
  /** 1-based line in the current draft. */
  newStart: number;
  /** Unchanged lines between the previous hunk and this one. */
  skipped: number;
  lines: HunkLine[];
};

/** The Markdown mode's whole answer: the hunks, and what it is not showing
 *  at either end. A hunk count alone cannot say "and 200 more lines follow,
 *  unchanged", and a reader who cannot see that has no idea how much of the
 *  document the diff covers. */
export type SourceDiff = {
  hunks: Hunk[];
  /** Unchanged lines after the last hunk. */
  trailing: number;
};

export type DiffBlock =
  /** `equal` is context; `del` is the archived draft's, `add` the current's. */
  | { kind: "equal" | "del" | "add"; html: string }
  /** The middle of a long unchanged run, behind a `<details>`. */
  | { kind: "collapsed"; count: number; html: string };

export type DiffStats = {
  /** Blocks only the current draft has. */
  added: number;
  /** Blocks only the archived draft has. */
  removed: number;
  /** Blocks present in both but rewritten — counted once, not as one of each. */
  changed: number;
};

export type DocumentDiff = {
  source: SourceDiff;
  rendered: DiffBlock[];
  stats: DiffStats;
  /** The current draft's label, for the summary line. */
  liveLabel: string;
  /** Set when what is being read is not in the current draft at all. */
  note: string | null;
};

/** Lines of context around each hunk, as git shows by default. */
const CONTEXT = 3;

/**
 * How much of a replaced line has to survive before its changed words are
 * marked. Below this the two lines are different lines that happen to share
 * a word or two, and marking them is noise on top of a line already tinted.
 */
const MIN_SIMILARITY = 0.3;

/** An unchanged run longer than this collapses; below it, context is cheaper
 *  to read than a disclosure triangle. */
const COLLAPSE_OVER = 3;

/** Collapse runs that touch or overlap, so one word is one mark. */
function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (last && run.start <= last.end) last.end = Math.max(last.end, run.end);
    else out.push({ ...run });
  }
  return out;
}

/**
 * Which words differ between two versions of the same text, as offsets into
 * each side.
 *
 * `diffWordsWithSpace` rather than `diffWords`: its parts concatenate back to
 * the exact inputs, which is the only way offsets into the originals can be
 * trusted. `diffWords` ignores whitespace when matching and then rebuilds the
 * values, so its parts no longer add up to either string.
 *
 * Returns null when too little survives for word marks to say anything.
 */
export function wordMarks(oldText: string, newText: string): { del: Run[]; add: Run[] } | null {
  if (!oldText || !newText) return null;
  const parts = diffWordsWithSpace(oldText, newText);
  const del: Run[] = [];
  const add: Run[] = [];
  let oldAt = 0;
  let newAt = 0;
  let kept = 0;

  for (const part of parts) {
    const length = part.value.length;
    if (part.added) {
      add.push({ start: newAt, end: newAt + length });
      newAt += length;
    } else if (part.removed) {
      del.push({ start: oldAt, end: oldAt + length });
      oldAt += length;
    } else {
      kept += part.value.trim().length;
      oldAt += length;
      newAt += length;
    }
  }

  const measure = Math.max(oldText.trim().length, newText.trim().length);
  if (measure === 0 || kept / measure < MIN_SIMILARITY) return null;
  if (del.length === 0 && add.length === 0) return null;
  return { del: mergeRuns(del), add: mergeRuns(add) };
}

/**
 * Mark the changed words on lines that replace each other.
 *
 * A removal immediately followed by an addition is an edit, not a deletion
 * and an unrelated insertion, and pairing them by position within the two
 * runs is what a side-by-side reader does by eye.
 */
function markReplacements(hunkLines: HunkLine[]): void {
  let i = 0;
  while (i < hunkLines.length) {
    if (hunkLines[i].kind !== "del") {
      i += 1;
      continue;
    }
    let j = i;
    while (j < hunkLines.length && hunkLines[j].kind === "del") j += 1;
    let k = j;
    while (k < hunkLines.length && hunkLines[k].kind === "add") k += 1;
    const dels = hunkLines.slice(i, j);
    const adds = hunkLines.slice(j, k);
    for (let n = 0; n < Math.min(dels.length, adds.length); n += 1) {
      const marks = wordMarks(dels[n].text, adds[n].text);
      if (!marks) continue;
      dels[n].marks = marks.del;
      adds[n].marks = marks.add;
    }
    i = Math.max(k, i + 1);
  }
}

/**
 * Git-style hunks for the Markdown mode. `skipped` on each hunk is how many
 * unchanged lines precede it, so the view can say what it is not showing
 * instead of implying the file starts there.
 */
export function sourceHunks(oldMarkdown: string, newMarkdown: string): SourceDiff {
  const archived = normaliseLineEndings(oldMarkdown);
  const patch = structuredPatch(
    "archived",
    "current",
    archived,
    normaliseLineEndings(newMarkdown),
    "",
    "",
    { context: CONTEXT },
  );

  let previousEnd = 1;
  const hunks = patch.hunks.map((hunk) => {
    const out: HunkLine[] = [];
    for (const raw of hunk.lines) {
      // Every line carries its marker in the first column, jsdiff's
      // "\\ No newline at end of file" included. Taking the marker from the
      // character and the text from the rest keeps the two in step.
      const kind: HunkLineKind =
        raw[0] === "+" ? "add" : raw[0] === "-" ? "del" : raw[0] === "\\" ? "note" : "context";
      out.push({ kind, text: raw.slice(1) });
    }
    markReplacements(out);
    const skipped = Math.max(0, hunk.oldStart - previousEnd);
    previousEnd = hunk.oldStart + hunk.oldLines;
    return { oldStart: hunk.oldStart, newStart: hunk.newStart, skipped, lines: out };
  });

  // What follows the last hunk. A document that ends in a newline has a
  // final empty line that is nobody's business, so it does not count.
  const total = archived.replace(/\n$/, "").split("\n").length;
  const trailing = hunks.length === 0 ? 0 : Math.max(0, total - (previousEnd - 1));
  return { hunks, trailing };
}

/* ---------------------------------------------------------------------------
   The rendered diff.
   --------------------------------------------------------------------------- */

/** Every text node's value, in document order — the string the word marks'
 *  offsets are measured against, and the same walk that applies them, so the
 *  two cannot disagree about what "offset 40" means. */
function plainText(nodes: RootContent[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") out += node.value;
    else if (node.type === "element") out += plainText(node.children as RootContent[]);
  }
  return out;
}

/**
 * Wrap the marked ranges of a tree's text in the diff's own element, walking
 * the text nodes with a running offset so a mark that spans a `<code>` or an
 * `<em>` boundary still lands on both halves.
 *
 * Nothing is spliced into HTML: the wrappers are hast elements, built here,
 * and the result goes back through rehype-sanitize before it is stringified.
 */
function applyMarks(nodes: RootContent[], marks: Run[], tagName: "mark" | "del"): RootContent[] {
  const className = tagName === "mark" ? "share-diff-ins" : "share-diff-del";
  let offset = 0;
  let next = 0;

  const walk = (list: RootContent[]): RootContent[] => {
    const out: RootContent[] = [];
    for (const node of list) {
      if (node.type === "element") {
        node.children = walk(node.children as RootContent[]) as Element["children"];
        out.push(node);
        continue;
      }
      if (node.type !== "text") {
        out.push(node);
        continue;
      }

      const start = offset;
      const end = offset + node.value.length;
      offset = end;

      // Skip marks that ended before this node (a mark can span several).
      while (next < marks.length && marks[next].end <= start) next += 1;
      if (next >= marks.length || marks[next].start >= end) {
        out.push(node);
        continue;
      }

      let at = start;
      for (let i = next; i < marks.length && marks[i].start < end; i += 1) {
        const from = Math.max(marks[i].start, start);
        const to = Math.min(marks[i].end, end);
        if (from > at) out.push({ type: "text", value: node.value.slice(at - start, from - start) });
        out.push({
          type: "element",
          tagName,
          properties: { className: [className] },
          children: [{ type: "text", value: node.value.slice(from - start, to - start) }],
        });
        at = to;
      }
      if (at < end) out.push({ type: "text", value: node.value.slice(at - start) });
    }
    return out;
  };

  return walk(nodes);
}

/**
 * Drop every id in a diff block.
 *
 * A changed heading appears twice — once as it was, once as it is — and two
 * elements cannot share an id. The reader's contents pane is built from the
 * draft being read, not from the diff, so nothing here is an anchor target.
 */
function stripIds(nodes: RootContent[]): void {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    if (node.properties && "id" in node.properties) delete node.properties.id;
    stripIds(node.children as RootContent[]);
  }
}

/**
 * Take the block's own indentation off, so a nested list item or an indented
 * continuation renders as itself rather than as an indented code block.
 *
 * Spaces only. A leading tab is a four-space indent to CommonMark, which
 * makes the line an indented code block — the renderer shows it as code, and
 * stripping the tab here would show it as a list item in the diff and as
 * code in the draft beside it.
 */
function dedent(text: string): string {
  const rows = text.split("\n").filter((row) => row.trim() !== "");
  if (rows.length === 0) return text;
  const width = Math.min(...rows.map((row) => /^ */.exec(row)![0].length));
  if (width === 0) return text;
  return text
    .split("\n")
    .map((row) => row.slice(width))
    .join("\n");
}

/** One block as sanitized HTML, with the changed words marked if asked. */
async function blockHtml(
  block: SourceBlock,
  marks?: Run[],
  tagName?: "mark" | "del",
): Promise<string> {
  const tree = await toSanitizedTree(dedent(block.text));
  const nodes = tree.children as RootContent[];
  stripIds(nodes);
  const decorated =
    marks && marks.length > 0 && tagName ? applyMarks(nodes, marks, tagName) : nodes;
  const html = stringifyDecorated(decorated);
  // Raw HTML and comments render to nothing; show the source so a change to
  // one is not an invisible change.
  return html.trim() === "" ? stringifyPlainBlock(block.text) : html;
}

/**
 * A stretch of unchanged blocks, rendered from the source that spans them.
 *
 * Rendering the slice rather than each block keeps the blank lines between
 * them — a list stays one list — and costs one parse instead of one per
 * block, which is what makes an unchanged 50 KB document cheap.
 */
async function sliceHtml(source: string[], from: SourceBlock, to: SourceBlock): Promise<string> {
  return renderHtml(source.slice(from.startLine - 1, to.endLine).join("\n"));
}

type Op =
  | { kind: "equal"; blocks: SourceBlock[] }
  | { kind: "del"; blocks: SourceBlock[] }
  | { kind: "add"; blocks: SourceBlock[] };

/**
 * The block-level edit script. Blocks compare on their kind and their
 * whitespace-collapsed text, so a rewrapped paragraph is unchanged and a
 * paragraph promoted to a heading is not.
 */
function blockOps(oldBlocks: SourceBlock[], newBlocks: SourceBlock[]): Op[] {
  // The kind is part of the key, so a paragraph promoted to a heading reads
  // as a change rather than a coincidence. One space is delimiter enough:
  // no kind contains one, and the normalised text never starts with one.
  const key = (block: SourceBlock) =>
    `${block.kind} ${block.text.replace(/\s+/g, " ").trim()}`;
  const parts = diffArrays(oldBlocks.map(key), newBlocks.map(key));

  const ops: Op[] = [];
  let oldAt = 0;
  let newAt = 0;
  for (const part of parts) {
    const count = part.value.length;
    if (part.added) {
      ops.push({ kind: "add", blocks: newBlocks.slice(newAt, newAt + count) });
      newAt += count;
    } else if (part.removed) {
      ops.push({ kind: "del", blocks: oldBlocks.slice(oldAt, oldAt + count) });
      oldAt += count;
    } else {
      // Equal by key: show the archived side, which is the page being read.
      ops.push({ kind: "equal", blocks: oldBlocks.slice(oldAt, oldAt + count) });
      oldAt += count;
      newAt += count;
    }
  }
  return ops;
}

/** Word marks are for prose. Inside a table or a code fence they would mark
 *  half a cell or half a token, so both sides show whole. */
function marksAllowed(block: SourceBlock): boolean {
  return block.kind !== "table" && block.kind !== "code" && block.kind !== "html";
}

/**
 * The Reader mode's diff: every changed block rendered on its own, runs of
 * unchanged blocks collapsed to their first, their last, and a count.
 */
export async function renderedDiff(
  oldMarkdown: string,
  newMarkdown: string,
): Promise<{ blocks: DiffBlock[]; stats: DiffStats }> {
  // One normalisation, then everything below works from these two strings:
  // the block splitter, the source slices the unchanged runs render from,
  // and the line numbers that tie them together.
  const archived = normaliseLineEndings(oldMarkdown);
  const current = normaliseLineEndings(newMarkdown);
  const oldSource = closeListsAtLazyLines(archived).split("\n");
  const oldBlocks = splitBlocks(archived);
  const newBlocks = splitBlocks(current);
  const ops = blockOps(oldBlocks, newBlocks);

  const out: DiffBlock[] = [];
  const stats: DiffStats = { added: 0, removed: 0, changed: 0 };

  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];

    if (op.kind === "equal") {
      const run = op.blocks;
      if (run.length === 0) continue;
      if (run.length <= COLLAPSE_OVER) {
        out.push({ kind: "equal", html: await sliceHtml(oldSource, run[0], run[run.length - 1]) });
        continue;
      }
      out.push({ kind: "equal", html: await sliceHtml(oldSource, run[0], run[0]) });
      out.push({
        kind: "collapsed",
        count: run.length - 2,
        html: await sliceHtml(oldSource, run[1], run[run.length - 2]),
      });
      out.push({
        kind: "equal",
        html: await sliceHtml(oldSource, run[run.length - 1], run[run.length - 1]),
      });
      continue;
    }

    // A removal followed by an addition is a rewrite. Pair each removed
    // block with the first added block of the same kind — by kind rather
    // than by position, because one bullet added in the middle of the run
    // shifts every later block and would otherwise report a table
    // "changed into" a list item. Whatever is left over is a plain removal
    // or a plain addition, shown after the pairs.
    const paired = op.kind === "del" && ops[i + 1]?.kind === "add" ? ops[i + 1].blocks : [];
    if (paired.length > 0) {
      const dels = op.blocks;
      const adds = paired;
      const taken = new Set<number>();
      const loneDels: DiffBlock[] = [];

      for (const del of dels) {
        const match = adds.findIndex((add, n) => !taken.has(n) && add.kind === del.kind);
        if (match === -1) {
          loneDels.push({ kind: "del", html: await blockHtml(del) });
          stats.removed += 1;
          continue;
        }
        taken.add(match);
        const add = adds[match];
        let delMarks: Run[] | undefined;
        let addMarks: Run[] | undefined;
        if (marksAllowed(del)) {
          const delTree = await toSanitizedTree(dedent(del.text));
          const addTree = await toSanitizedTree(dedent(add.text));
          const marks = wordMarks(
            plainText(delTree.children as RootContent[]),
            plainText(addTree.children as RootContent[]),
          );
          if (marks) {
            delMarks = marks.del;
            addMarks = marks.add;
          }
        }
        out.push({ kind: "del", html: await blockHtml(del, delMarks, "del") });
        out.push({ kind: "add", html: await blockHtml(add, addMarks, "mark") });
        stats.changed += 1;
      }

      out.push(...loneDels);
      for (let n = 0; n < adds.length; n += 1) {
        if (taken.has(n)) continue;
        out.push({ kind: "add", html: await blockHtml(adds[n]) });
        stats.added += 1;
      }
      i += 1; // the paired addition is done
      continue;
    }

    for (const block of op.blocks) {
      out.push({ kind: op.kind, html: await blockHtml(block) });
      if (op.kind === "add") stats.added += 1;
      else stats.removed += 1;
    }
  }

  return { blocks: out, stats };
}

/** True when there is nothing to show: the two drafts read the same. */
export function isEmptyDiff(diff: DocumentDiff): boolean {
  return (
    diff.source.hunks.length === 0 &&
    diff.stats.added === 0 &&
    diff.stats.removed === 0 &&
    diff.stats.changed === 0
  );
}

/**
 * Both representations of one comparison.
 *
 * `live` is null for a context file the current draft no longer carries: the
 * whole file then reads as removed, which is exactly what happened to it.
 */
export async function documentDiff({
  archived,
  live,
  liveLabel,
}: {
  archived: string;
  live: string | null;
  liveLabel: string;
}): Promise<DocumentDiff> {
  // Normalised once, here, and used for both representations: the two modes
  // must never be looking at different text.
  const from = normaliseLineEndings(archived);
  const to = normaliseLineEndings(live ?? "");
  const source = sourceHunks(from, to);
  const rendered = await renderedDiff(from, to);
  return {
    source,
    rendered: rendered.blocks,
    stats: rendered.stats,
    liveLabel,
    note: live === null ? "This file is not in the current draft." : null,
  };
}
