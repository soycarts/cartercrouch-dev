import { Fragment } from "react";
import type { Hunk, HunkLine } from "@/lib/share/diff";

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

const MARKER = { add: "+ ", del: "− ", context: "  " } as const;

/**
 * The Markdown mode's diff: a patch, read the way a patch is read. Every
 * line carries its own marker in a fixed column, so the shape survives a
 * copy out of the box as well as the tint does inside it.
 */
export function DiffSource({ hunks }: { hunks: Hunk[] }) {
  return (
    <pre
      className="share-source share-diff-source"
      tabIndex={0}
      aria-label="Markdown differences from the current draft"
    >
      {hunks.map((hunk, h) => (
        <Fragment key={`${hunk.oldStart}-${hunk.newStart}`}>
          {hunk.skipped > 0 && (
            <span className="share-diff-sep">
              {`⋯ ${hunk.skipped} unchanged line${hunk.skipped === 1 ? "" : "s"}`}
            </span>
          )}
          {hunk.lines.map((line, i) => (
            <span key={`${h}-${i}`} className={`share-diff-line is-${line.kind}`}>
              <span className="share-diff-gutter">{MARKER[line.kind]}</span>
              {marked(line)}
            </span>
          ))}
        </Fragment>
      ))}
    </pre>
  );
}
