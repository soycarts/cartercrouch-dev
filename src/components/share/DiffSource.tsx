import { Fragment } from "react";
import type { HunkLine, SourceDiff } from "@/lib/share/diff";

/**
 * The changed words inside a replaced line.
 *
 * React builds the elements, so the line's text is never spliced into HTML —
 * a line reading `<script>` is a string here and stays one.
 */
function marked(line: HunkLine) {
  if (!line.marks?.length) return line.text;
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const [i, mark] of line.marks.entries()) {
    if (mark.start > at) out.push(line.text.slice(at, mark.start));
    const word = line.text.slice(mark.start, mark.end);
    out.push(
      line.kind === "add" ? (
        <mark key={i} className="share-diff-ins">
          {word}
        </mark>
      ) : (
        <del key={i} className="share-diff-del">
          {word}
        </del>
      ),
    );
    at = mark.end;
  }
  if (at < line.text.length) out.push(line.text.slice(at));
  return out;
}

/**
 * One character in the first column, as a patch has it: `+`, `-`, a space,
 * or the backslash of jsdiff's no-newline note. ASCII, and the gap after it
 * is padding rather than a space, so selecting a hunk and pasting it gives a
 * unified diff a patch tool would accept — not one with a minus sign and a
 * stray space in front of every line.
 */
const MARKER = { add: "+", del: "-", context: " ", note: "\\" } as const;

const unchanged = (n: number) => `⋯ ${n} unchanged line${n === 1 ? "" : "s"}`;

/**
 * The Markdown mode's diff: a patch, read the way a patch is read.
 *
 * Each hunk is its own `<pre>`, and what lies between them is a paragraph
 * outside it — so selecting a hunk copies the hunk. The counts are chrome
 * and stay out of the clipboard, at both ends: a diff that shows six lines
 * of a four-hundred-line document should say so.
 */
export function DiffSource({ source }: { source: SourceDiff }) {
  return (
    <div className="share-diff-hunks">
      {source.hunks.map((hunk, h) => (
        <Fragment key={`${hunk.oldStart}-${hunk.newStart}`}>
          {hunk.skipped > 0 && <p className="share-diff-sep">{unchanged(hunk.skipped)}</p>}
          <pre
            className="share-source share-diff-source"
            tabIndex={0}
            aria-label={`Differences from line ${hunk.oldStart}`}
          >
            {hunk.lines.map((line, i) => (
              <span key={`${h}-${i}`} className={`share-diff-line is-${line.kind}`}>
                <span className="share-diff-gutter">{MARKER[line.kind]}</span>
                {marked(line)}
              </span>
            ))}
          </pre>
        </Fragment>
      ))}
      {source.trailing > 0 && <p className="share-diff-sep">{unchanged(source.trailing)}</p>}
    </div>
  );
}
