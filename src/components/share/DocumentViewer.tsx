"use client";

import { useState } from "react";
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

function ActionButton({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => Promise<void>;
  href?: string;
}) {
  const [done, setDone] = useState(false);
  const cls = "share-action";
  if (href) {
    return (
      <a href={href} className={cls}>
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={`${cls} ${done ? "is-done" : ""}`}
      onClick={async () => {
        try {
          await onClick?.();
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? "Copied" : label}
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
}: {
  doc: ViewerDocument;
  initialView?: View;
  compact?: boolean;
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
