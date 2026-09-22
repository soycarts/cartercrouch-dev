"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentDiff } from "@/lib/share/diff";
import type { RenderedSection } from "@/lib/share/markdown";
import { hasRenderedChange, hasSourceChange } from "@/lib/share/diff";
import { DiffProse } from "./DiffProse";
import { DiffSource } from "./DiffSource";
import { Prose } from "./Prose";
import { ReaderControls } from "./ReaderControls";
import { VersionMenu, type VersionOption } from "./VersionMenu";

export type ViewerDocument = {
  /** Sections for the styled reader (sanitized HTML). */
  sections: RenderedSection[];
  /** The whole document as one sanitized HTML string, for "copy formatted". */
  html: string;
  /** Exact Markdown source. */
  markdown: string;
  /** Where the PDF and .md live for this document or attachment. */
  pdfUrl: string;
  markdownUrl: string;
  /** Set on an archived draft only: how it differs from the current one. */
  diff?: DocumentDiff;
};

type View = "reader" | "markdown";

async function copyFormatted(html: string, markdown: string) {
  try {
    if ("ClipboardItem" in window) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    // fall through to plain text
  }
  await navigator.clipboard.writeText(markdown);
}

/**
 * A download link, or a copy button that says "Copied" for a moment.
 *
 * Both labels are always in the DOM, stacked in one grid cell, with the
 * inactive one hidden: the button is as wide as its widest label from the
 * start, so flipping to "Copied" no longer shoves the buttons beside it.
 */
function ActionButton({
  label,
  doneLabel = "Copied",
  onClick,
  href,
}: {
  label: string;
  doneLabel?: string;
  onClick?: () => Promise<void>;
  href?: string;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(timer);
  }, [done]);

  if (href) {
    return (
      <a href={href} className="share-action">
        <span className="share-action__stack">
          <span className="share-action__label">{label}</span>
        </span>
      </a>
    );
  }
  return (
    <button
      type="button"
      className={`share-action ${done ? "is-done" : ""}`}
      aria-live="polite"
      onClick={async () => {
        try {
          await onClick?.();
          setDone(true);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      <span className="share-action__stack">
        <span className={`share-action__label ${done ? "is-hidden" : ""}`}>{label}</span>
        <span className={`share-action__label ${done ? "" : "is-hidden"}`}>{doneLabel}</span>
      </span>
    </button>
  );
}

/**
 * The exact source. Focusable, and it owns Cmd/Ctrl+A while focused, so a
 * click into the box followed by select-all selects the Markdown rather than
 * the whole page.
 */
function SourceBox({ markdown }: { markdown: string }) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLPreElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(event.currentTarget);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };
  return (
    <pre className="share-source" tabIndex={0} onKeyDown={onKeyDown} aria-label="Markdown source">
      {markdown}
    </pre>
  );
}

/**
 * One line above the diff saying which way round it is and how much moved.
 * The header's superseded notice says *that* this draft was replaced; this
 * says what the replacement did.
 *
 * The counts are the ones the mode being read can actually show: blocks in
 * the Reader, hunks in the Markdown mode. One set of numbers over the other
 * mode's body is a line that contradicts what is under it.
 *
 * The separators are in the text, not between the elements, so the line
 * reads as one sentence to anything that takes its textContent.
 */
function DiffSummary({
  diff,
  view,
  versionLabel,
}: {
  diff: DocumentDiff;
  view: View;
  versionLabel: string | null;
}) {
  const { added, removed, changed } = diff.stats;
  const counts =
    view === "markdown"
      ? diff.source.hunks.length > 0
        ? [`${diff.source.hunks.length} hunk${diff.source.hunks.length === 1 ? "" : "s"}`]
        : []
      : [
          changed > 0 ? `${changed} changed` : null,
          added > 0 ? `${added} added` : null,
          removed > 0 ? `${removed} removed` : null,
        ].filter(Boolean);
  return (
    <p className="share-diff-summary">
      <span>
        Draft {versionLabel ?? "archived"} → draft {diff.liveLabel}
      </span>
      {counts.length > 0 && (
        <span className="share-diff-summary__counts">{` · ${counts.join(" · ")}`}</span>
      )}
    </p>
  );
}

/**
 * Reader ⇄ Markdown toggle, centred, with the four actions beside it. Used
 * for the main document and, inside the popup, for every attachment.
 */
export function DocumentViewer({
  doc,
  initialView = "reader",
  initialDiff = false,
  compact = false,
  title = null,
  aside = null,
  versionLabel = null,
  versions = [],
  superseded = null,
}: {
  doc: ViewerDocument;
  initialView?: View;
  /** Start on the diff — `?diff=1`, so a diff link opens as one. */
  initialDiff?: boolean;
  compact?: boolean;
  /** The lifted H1, for the popup — the main page prints its own. */
  title?: string | null;
  /** The draft being shown, and every draft to choose between. */
  versionLabel?: string | null;
  versions?: VersionOption[];
  /** Set only on an archived draft. The diff control needs no more than
   *  whether there is a current draft this one is behind. */
  superseded?: { at: string; currentHref: string } | null;
  /** Side pane (file tree, contents). The bar spans the full width above
   *  both pane and body, so it has the whole measure to stay on one row. */
  aside?: React.ReactNode;
}) {
  const [view, setView] = useState<View>(initialView);
  // The diff is offered on an archived page and nowhere else: the current
  // draft has nothing to be compared with, and the attachment popup shows a
  // file of the draft you are already reading.
  const canDiff = !compact && superseded !== null;
  // The comparison is computed on request, so the control has two jobs. With
  // the payload in the props it is a switch. Without it — this page was
  // opened without ?diff=1 — it is a link, and pressing it fetches the page
  // that has it.
  const hasDiff = doc.diff !== undefined;
  const [diff, setDiff] = useState(hasDiff && initialDiff);

  /** This page's URL with both axes of the diff written into it. */
  const diffUrl = (on: boolean, mode: View) => {
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("diff", "1");
    else url.searchParams.delete("diff");
    // The mode travels with it, so a diff someone sends opens in the mode
    // they were reading it in.
    if (mode === "markdown") url.searchParams.set("view", "markdown");
    else url.searchParams.delete("view");
    return `${url.pathname}${url.search}${url.hash}`;
  };

  // Mirror the state into the URL so a diff is a link someone can send,
  // without a navigation: the page's own props already hold both drafts.
  // Only the viewer that owns the control writes the URL — a popup open over
  // an archived page must not strip its ?diff=1.
  const mounted = useRef(false);
  useEffect(() => {
    if (!canDiff || !hasDiff) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.history.replaceState(null, "", diffUrl(diff, view));
  }, [canDiff, hasDiff, diff, view]);

  const toggleDiff = () => {
    if (hasDiff) {
      setDiff((was) => !was);
      return;
    }
    // Nothing to show yet: ask the server for it. A full navigation is the
    // honest way to say "this needs work done", and it lands on a URL that
    // is already the shareable one.
    window.location.assign(diffUrl(true, view));
  };

  const tab = (target: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === target}
      onClick={() => setView(target)}
      className={`share-tab ${view === target ? "is-active" : ""}`}
    >
      {label}
    </button>
  );

  const draft =
    view === "markdown" ? (
      <SourceBox markdown={doc.markdown} />
    ) : (
      <Prose sections={doc.sections} />
    );

  // The two modes keep their meaning under the diff: Reader still renders
  // prose, Markdown still shows source. Only what they are pointed at
  // changes — and each mode answers for its own emptiness. Block statistics
  // and line hunks do not agree about what "no change" means: a draft that
  // gained a trailing space has a hunk and no changed block, and saying "no
  // differences" over a patch that is plainly showing one is worse than
  // saying nothing.
  const empty = doc.diff
    ? !(view === "markdown" ? hasSourceChange(doc.diff) : hasRenderedChange(doc.diff))
    : true;
  // A limit the comparison ran into, in the mode it affects.
  const limit =
    doc.diff && view === "markdown" && doc.diff.source.tooLarge
      ? "This change is too large to show line by line."
      : doc.diff && view === "reader" && doc.diff.stats.coarse
        ? "A change this large is shown in whole blocks rather than word by word."
        : null;

  const body =
    diff && doc.diff ? (
      <div className="share-diff">
        <DiffSummary diff={doc.diff} view={view} versionLabel={versionLabel} />
        {doc.diff.note && <p className="share-diff-note">{doc.diff.note}</p>}
        {limit && <p className="share-diff-note">{limit}</p>}
        {empty && !doc.diff.source.tooLarge ? (
          <p className="share-diff-note">No differences from the current draft.</p>
        ) : view === "markdown" ? (
          <DiffSource source={doc.diff.source} />
        ) : (
          <DiffProse blocks={doc.diff.rendered} />
        )}
      </div>
    ) : (
      draft
    );

  return (
    <div className={compact ? "share-viewer share-viewer--compact" : "share-viewer"}>
      {title && <h1 className="share-title share-title--popup">{title}</h1>}
      <div className="share-bar no-print">
        <div className="share-modes">
          {/* Drafts belong to the document, not to one attachment inside a
              popup — the popup's bar leaves the menu out, as it does the
              reader controls. It sits apart from the view toggle: choosing a
              draft changes what is shown, not how. */}
          {!compact && versionLabel && versions.length > 0 && (
            <VersionMenu label={versionLabel} versions={versions} />
          )}
          <div className="share-toggle" role="tablist">
            {tab("reader", "Reader")}
            {tab("markdown", "Markdown")}
          </div>
          {/* Right of the view toggle, boxed like the draft menu: it is not a
              third view, it is what the two views are pointed at.

              "DIFF", not "DIFF VS LIVE", in the same narrower padding the
              reader controls use: with those two it is 1132px of the 1180px
              measure at 1440, and 1128 of 1128 at 1200 — one row at both.
              The full label is 64px wider and fits at neither. The title,
              the aria-label and the summary line under the bar all say
              which way round the comparison runs. */}
          {canDiff && (
            <div className="share-diffbox">
              <button
                type="button"
                className={`share-tab share-tab--tight share-diff-toggle ${diff ? "is-active" : ""}`}
                aria-pressed={diff}
                aria-label="Diff vs live"
                title="Diff vs live"
                onClick={toggleDiff}
              >
                Diff
              </button>
            </div>
          )}
        </div>
        <div className="share-actions">
          <ActionButton label="Copy formatted" onClick={() => copyFormatted(doc.html, doc.markdown)} />
          <ActionButton label="Copy markdown" onClick={() => navigator.clipboard.writeText(doc.markdown)} />
          <ActionButton label="Download PDF" href={`${doc.pdfUrl}?download=1`} />
          <ActionButton label="Download MD" href={`${doc.markdownUrl}?download=1`} />
        </div>
        {/* Theme and text size belong to the page, not to a document, so the
            popup's own bar leaves them out — one set of controls, on the bar
            behind it, driving both. */}
        {!compact && <ReaderControls />}
      </div>
      {aside ? (
        <div className="share-layout mt-8">
          <aside className="share-pane">{aside}</aside>
          <div className="min-w-0">{body}</div>
        </div>
      ) : (
        <div className="mt-8">{body}</div>
      )}
    </div>
  );
}
