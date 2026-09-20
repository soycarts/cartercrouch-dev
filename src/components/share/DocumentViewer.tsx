"use client";

import { useEffect, useState } from "react";
import type { RenderedSection } from "@/lib/share/markdown";
import { Prose } from "./Prose";

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
 * Reader ⇄ Markdown toggle, centred, with the four actions beside it. Used
 * for the main document and, inside the popup, for every attachment.
 */
export function DocumentViewer({
  doc,
  initialView = "reader",
  compact = false,
  title = null,
}: {
  doc: ViewerDocument;
  initialView?: View;
  compact?: boolean;
  /** The lifted H1, for the popup — the main page prints its own. */
  title?: string | null;
}) {
  const [view, setView] = useState<View>(initialView);
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

  return (
    <div className={compact ? "share-viewer share-viewer--compact" : "share-viewer"}>
      {title && <h1 className="share-title share-title--popup">{title}</h1>}
      <div className="share-bar no-print">
        <div className="share-toggle" role="tablist">
          {tab("reader", "Reader")}
          {tab("markdown", "Markdown")}
        </div>
        <div className="share-actions">
          <ActionButton label="Copy formatted" onClick={() => copyFormatted(doc.html, doc.markdown)} />
          <ActionButton label="Copy markdown" onClick={() => navigator.clipboard.writeText(doc.markdown)} />
          <ActionButton label="Download formatted" href={`${doc.pdfUrl}?download=1`} />
          <ActionButton label="Download markdown" href={`${doc.markdownUrl}?download=1`} />
        </div>
      </div>
      {view === "markdown" ? (
        <pre className="share-source mt-8">{doc.markdown}</pre>
      ) : (
        <div className="mt-8">
          <Prose sections={doc.sections} />
        </div>
      )}
    </div>
  );
}
