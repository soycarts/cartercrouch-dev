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
  /** Set when the line diff ran out of its budget and gave up. The mode
   *  says so rather than showing an empty box. */
  tooLarge: boolean;
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
  /** Set when a limit coarsened the answer: whole runs instead of blocks,
   *  or no word marks. The counts are still true; they are just blunter. */
  coarse: boolean;
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

/** How much of the shorter side must survive for two blocks to be one block
 *  rewritten rather than a removal and an unrelated addition. */
const MIN_PAIR_SIMILARITY = 0.5;

/** How far from its own position a removal looks for the addition that
 *  replaced it. */
const PAIR_WINDOW = 8;

/* ---------------------------------------------------------------------------
   Limits.

   This runs inside a page request, on two documents of up to 900 KB, and
   both of the diff algorithms underneath it cost O(N × D) — the product of
   the size and the *difference*. On a pair of drafts that share almost
   nothing, that is minutes, not milliseconds. Every limit below buys a
   bounded answer at the price of a coarser one, and each says in the UI
   what it gave up.
   --------------------------------------------------------------------------- */

/** Wall-clock budget for the line diff. jsdiff returns undefined when it
 *  runs out, which is how the Markdown mode learns to say so. */
const SOURCE_BUDGET_MS = 1500;

/** The same for the block diff. Out of budget, every block reads as
 *  replaced, which is the truthful coarse answer. */
const BLOCK_BUDGET_MS = 600;

/** Above this many changed blocks, each run is rendered whole — one parse
 *  for the run instead of one per block. Six hundred blocks is already a
 *  document nobody reads block by block. */
const BLOCK_LIMIT = 600;

/** Word marks are for reading a sentence that moved. Past this many pairs,
 *  or this much text on either side of one, they cost more than they say. */
const MARK_PAIR_LIMIT = 200;
const MARK_TEXT_LIMIT = 256 * 1024;

/**
 * The most Markdown the diff will format as prose in one block or one run.
 *
 * A document with no blank line in it is one block, and that block can be
 * the whole 900 KB. Formatting it costs a full parse per side, which is the
 * reader's own cost — except that the reader pays it once for the document
 * and the diff would pay it twice for a comparison nobody asked to be
 * beautiful. Over this, the text is shown as text: mono, escaped, exact.
 *
 * It is stricter than MARK_TEXT_LIMIT on purpose. Marks need the parsed
 * tree, so anything past this limit has no marks either way; the looser
 * limit is the one that would matter if this were ever raised.
 */
const RENDER_LIMIT = 64 * 1024;

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
    { context: CONTEXT, timeout: SOURCE_BUDGET_MS },
  );
  if (!patch) return { hunks: [], trailing: 0, tooLarge: true };

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
  return { hunks, trailing, tooLarge: false };
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

/**
 * A block, parsed once.
 *
 * The similarity score, the word marks and the HTML all need the same view
 * of the same block. Parsing it once and passing this around is not only
 * cheaper — four parses per pair was the single largest cost in the rendered
 * diff — it also guarantees that the offsets the marks are measured in are
 * offsets into the tree they are applied to.
 */
type ParsedBlock = {
  block: SourceBlock;
  nodes: RootContent[];
  /** Every text node's value, concatenated: what the marks index into.
   *  For a block past RENDER_LIMIT this is the Markdown source instead,
   *  because there is no tree. */
  text: string;
  /** True when the block was shown as exact text rather than formatted. */
  plain: boolean;
};

async function parseBlock(block: SourceBlock): Promise<ParsedBlock> {
  const source = dedent(block.text);
  // Too big to format is also too big to score and too big to mark: there
  // is no tree to measure offsets in. `text` stays the source so that a
  // pair of monsters can still be paired on position.
  if (source.length > RENDER_LIMIT) {
    return { block, nodes: [], text: source, plain: true };
  }
  const tree = await toSanitizedTree(source);
  const nodes = tree.children as RootContent[];
  stripIds(nodes);
  return { block, nodes, text: plainText(nodes), plain: false };
}

/** One parsed block as sanitized HTML, with the changed words marked if
 *  asked. Each parsed block is rendered exactly once, which is what makes it
 *  safe for applyMarks to decorate its nodes in place. */
function blockHtml(parsed: ParsedBlock, marks?: Run[], tagName?: "mark" | "del"): string {
  if (parsed.plain) return stringifyPlainBlock(parsed.block.text);
  const decorated =
    marks && marks.length > 0 && tagName
      ? applyMarks(parsed.nodes, marks, tagName)
      : parsed.nodes;
  const html = stringifyDecorated(decorated);
  // Raw HTML and comments render to nothing; show the source so a change to
  // one is not an invisible change.
  return html.trim() === "" ? stringifyPlainBlock(parsed.block.text) : html;
}

/**
 * Markdown as prose, or — past RENDER_LIMIT — as exact escaped text.
 *
 * `plain` is what the caller reports as a coarsened answer. Both paths go
 * through the same sanitizer; the difference is only how much work the
 * renderer is asked to do.
 */
async function boundedHtml(text: string): Promise<{ html: string; plain: boolean }> {
  if (text.length > RENDER_LIMIT) return { html: stringifyPlainBlock(text), plain: true };
  return { html: await renderHtml(text), plain: false };
}

/**
 * A stretch of blocks, rendered from the source that spans them.
 *
 * Rendering the slice rather than each block keeps the blank lines between
 * them — a list stays one list — and costs one parse instead of one per
 * block, which is what makes an unchanged 50 KB document cheap.
 */
async function sliceHtml(
  source: string[],
  from: SourceBlock,
  to: SourceBlock,
): Promise<{ html: string; plain: boolean }> {
  return boundedHtml(source.slice(from.startLine - 1, to.endLine).join("\n"));
}

/**
 * How much of the shorter side survives a rewrite, 0 to 1.
 *
 * Counted in non-whitespace characters, against the shorter side, so that a
 * sentence expanded into a paragraph still counts as the same block having
 * grown rather than as two unrelated blocks.
 */
export function similarity(oldText: string, newText: string): number {
  if (!oldText.trim() || !newText.trim()) return 0;
  let kept = 0;
  for (const part of diffWordsWithSpace(oldText, newText)) {
    if (!part.added && !part.removed) kept += part.value.replace(/\s+/g, "").length;
  }
  const shorter = Math.min(
    oldText.replace(/\s+/g, "").length,
    newText.replace(/\s+/g, "").length,
  );
  return shorter === 0 ? 0 : kept / shorter;
}

/**
 * Which removed block each added block rewrote.
 *
 * Pairing the first removal with the first addition is wrong as soon as one
 * of the removals was a removal and nothing else: deleting a bullet and
 * editing the next one reported the deleted bullet's words as having turned
 * into the edited one's — a sentence nobody wrote, presented as a tracked
 * change. So: score every candidate of the same kind, take the best pairs
 * first, and require half of the shorter side to survive before calling two
 * blocks the same block at all.
 *
 * Candidates are limited to a window around each removal's position. Edits
 * are local — a rewrite does not travel twenty blocks down the document —
 * and the window is what keeps the scoring from being quadratic in the size
 * of the run.
 */
function pairBySimilarity(dels: ParsedBlock[], adds: ParsedBlock[]): Map<number, number> {
  const candidates: { score: number; del: number; add: number }[] = [];
  for (let d = 0; d < dels.length; d += 1) {
    const from = Math.max(0, d - PAIR_WINDOW);
    const to = Math.min(adds.length, d + PAIR_WINDOW + 1);
    for (let a = from; a < to; a += 1) {
      if (dels[d].block.kind !== adds[a].block.kind) continue;
      // Scoring is a word diff of its own; a pair of enormous blocks is
      // paired on position rather than measured.
      if (dels[d].plain || adds[a].plain) {
        if (d === a) candidates.push({ score: MIN_PAIR_SIMILARITY, del: d, add: a });
        continue;
      }
      const score = similarity(dels[d].text, adds[a].text);
      if (score >= MIN_PAIR_SIMILARITY) candidates.push({ score, del: d, add: a });
    }
  }
  candidates.sort((x, y) => y.score - x.score || x.del - y.del || x.add - y.add);

  const pairs = new Map<number, number>();
  const taken = new Set<number>();
  for (const candidate of candidates) {
    if (pairs.has(candidate.del) || taken.has(candidate.add)) continue;
    pairs.set(candidate.del, candidate.add);
    taken.add(candidate.add);
  }
  return pairs;
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
  const parts = diffArrays(oldBlocks.map(key), newBlocks.map(key), {
    timeout: BLOCK_BUDGET_MS,
  });
  // Out of budget: the honest coarse answer is that all of this went and
  // all of that arrived.
  if (!parts) {
    return [
      ...(oldBlocks.length > 0 ? [{ kind: "del", blocks: oldBlocks } as Op] : []),
      ...(newBlocks.length > 0 ? [{ kind: "add", blocks: newBlocks } as Op] : []),
    ];
  }

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
  const newSource = closeListsAtLazyLines(current).split("\n");
  const oldBlocks = splitBlocks(archived);
  const newBlocks = splitBlocks(current);
  const ops = blockOps(oldBlocks, newBlocks);

  // How much of this document moved decides how finely it is worth showing.
  // Past the limit, a run is rendered whole — one parse for the run instead
  // of one for each of its blocks — and nothing is paired or marked. The
  // counts stay true; a reader looking at four hundred changed blocks is
  // reading a rewrite, not tracking an edit.
  const changed = ops.reduce((n, op) => (op.kind === "equal" ? n : n + op.blocks.length), 0);
  const coarse = changed > BLOCK_LIMIT;

  const out: DiffBlock[] = [];
  const stats: DiffStats = { added: 0, removed: 0, changed: 0, coarse };

  /** One run of blocks, rendered from the source that spans it. */
  const runHtml = (source: string[], blocks: SourceBlock[]) =>
    sliceHtml(source, blocks[0], blocks[blocks.length - 1]);

  /** Every render reports whether it had to fall back to exact text. */
  const render = async (promise: Promise<{ html: string; plain: boolean }>) => {
    const { html, plain } = await promise;
    if (plain) stats.coarse = true;
    return html;
  };

  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];

    if (op.kind === "equal") {
      const run = op.blocks;
      if (run.length === 0) continue;
      if (run.length <= COLLAPSE_OVER) {
        out.push({ kind: "equal", html: await render(runHtml(oldSource, run)) });
        continue;
      }
      out.push({ kind: "equal", html: await render(sliceHtml(oldSource, run[0], run[0])) });
      out.push({
        kind: "collapsed",
        count: run.length - 2,
        html: await render(sliceHtml(oldSource, run[1], run[run.length - 2])),
      });
      out.push({
        kind: "equal",
        html: await render(sliceHtml(oldSource, run[run.length - 1], run[run.length - 1])),
      });
      continue;
    }

    if (coarse) {
      const source = op.kind === "del" ? oldSource : newSource;
      out.push({ kind: op.kind, html: await render(runHtml(source, op.blocks)) });
      if (op.kind === "add") stats.added += op.blocks.length;
      else stats.removed += op.blocks.length;
      continue;
    }

    // A removal followed by an addition is a rewrite of some of these
    // blocks and an outright change to the rest. Pair what belongs
    // together, then emit in the archived draft's own order: each removal
    // where it stood, its replacement immediately after it, and the
    // additions that replaced nothing at the end of the run.
    const addOp = op.kind === "del" && ops[i + 1]?.kind === "add" ? ops[i + 1] : null;
    if (addOp) {
      const dels = await Promise.all(op.blocks.map(parseBlock));
      const adds = await Promise.all(addOp.blocks.map(parseBlock));
      const pairs = pairBySimilarity(dels, adds);
      // Word marks are a per-pair cost on text of unbounded length. Past
      // either limit the pair still shows, whole on each side, the way a
      // changed table always has.
      const marking = pairs.size <= MARK_PAIR_LIMIT;
      if (!marking) stats.coarse = true;

      for (let d = 0; d < dels.length; d += 1) {
        const a = pairs.get(d);
        if (a === undefined) {
          out.push({ kind: "del", html: blockHtml(dels[d]) });
          stats.removed += 1;
          continue;
        }
        const affordable =
          marking &&
          !dels[d].plain &&
          !adds[a].plain &&
          dels[d].text.length <= MARK_TEXT_LIMIT &&
          adds[a].text.length <= MARK_TEXT_LIMIT;
        if (!affordable) stats.coarse = true;
        const marks =
          affordable && marksAllowed(dels[d].block)
            ? wordMarks(dels[d].text, adds[a].text)
            : null;
        if (dels[d].plain || adds[a].plain) stats.coarse = true;
        out.push({ kind: "del", html: blockHtml(dels[d], marks?.del, "del") });
        out.push({ kind: "add", html: blockHtml(adds[a], marks?.add, "mark") });
        stats.changed += 1;
      }

      const taken = new Set(pairs.values());
      for (let a = 0; a < adds.length; a += 1) {
        if (taken.has(a)) continue;
        out.push({ kind: "add", html: blockHtml(adds[a]) });
        stats.added += 1;
      }

      i += 1; // the paired addition is done
      continue;
    }

    for (const block of op.blocks) {
      out.push({ kind: op.kind, html: blockHtml(await parseBlock(block)) });
      if (op.kind === "add") stats.added += 1;
      else stats.removed += 1;
    }
  }

  return { blocks: out, stats };
}

/**
 * Whether each mode has anything to show. They are asked separately on
 * purpose: block statistics and line hunks do not agree about what "no
 * change" means, and each mode has to answer for its own body.
 *
 * A draft that gained trailing whitespace on one line is the case that
 * separates them — a hunk, and not a single changed block, because the
 * blocks compare on whitespace-collapsed text. Reading "no differences"
 * over a patch that is plainly showing one is worse than saying nothing.
 */
export function hasRenderedChange(diff: DocumentDiff): boolean {
  return diff.stats.added + diff.stats.removed + diff.stats.changed > 0;
}

export function hasSourceChange(diff: DocumentDiff): boolean {
  return diff.source.hunks.length > 0;
}

/** True when neither mode has anything to show: the two drafts read the
 *  same, to the line as well as to the block. */
export function isEmptyDiff(diff: DocumentDiff): boolean {
  return !hasSourceChange(diff) && !hasRenderedChange(diff);
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
