import type { DiffBlock } from "@/lib/share/diff";

/**
 * The Reader mode's diff: the same prose the reader shows, but only the
 * blocks that moved, each tinted and ruled on the side it belongs to.
 *
 * Unchanged stretches keep their first and last block as context and put the
 * rest behind a disclosure, so the shape of the document survives without
 * the reader having to scroll past what did not change.
 *
 * Every `html` here came out of `renderedDiff`, which renders each block
 * through the reader's own sanitizing pipeline and then sanitizes the marks
 * it adds on top — the only reason dangerouslySetInnerHTML is safe, exactly
 * as in `Prose`.
 */
export function DiffProse({ blocks }: { blocks: DiffBlock[] }) {
  return (
    <article className="prose-share share-diff-prose">
      {blocks.map((block, i) =>
        block.kind === "collapsed" ? (
          <details key={i} className="share-diff-collapsed">
            <summary className="share-diff-sep">
              {`⋯ ${block.count} unchanged block${block.count === 1 ? "" : "s"}`}
            </summary>
            <div className="prose-body min-w-0" dangerouslySetInnerHTML={{ __html: block.html }} />
          </details>
        ) : (
          <div key={i} className={`share-diff-block is-${block.kind}`}>
            <div className="prose-body min-w-0" dangerouslySetInnerHTML={{ __html: block.html }} />
          </div>
        ),
      )}
    </article>
  );
}
