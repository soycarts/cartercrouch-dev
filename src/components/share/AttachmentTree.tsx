"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentViewer, type ViewerDocument } from "./DocumentViewer";

export type ViewerAttachment = ViewerDocument & {
  name: string;
  title: string | null;
  /** This file's own reader page, for "Open as page". */
  pageUrl: string;
};

/**
 * File tree: the document itself first, then its context files indented
 * beneath. A file name opens that file in a popup over whatever page you are
 * on; the ↗ beside it promotes the file to a page of its own, with the same
 * bar, contents pane and reader controls as the document. Hidden entirely
 * when there are no attachments.
 */
export function AttachmentTree({
  documentName,
  documentHref,
  files,
  currentFile = null,
}: {
  documentName: string;
  /** Where the document row goes when this is a file's own page. */
  documentHref: string;
  files: ViewerAttachment[];
  /** The attachment this page is showing, if any; null on the document. */
  currentFile?: string | null;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  // A modal dialog still lets the page behind it scroll on iOS, which reads
  // as the sheet drifting under the finger. Freeze the body while one is open.
  useEffect(() => {
    if (open === null) return;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, [open]);

  if (files.length === 0) return null;
  const current = open === null ? null : files[open];
  const onDocument = currentFile === null;

  const list = (
    <ul>
      {/* On the document itself this row only dismisses a popup; from a
          file's own page it is the way back. */}
      <li className="share-tree__row">
        {onDocument ? (
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-current={open === null ? "true" : undefined}
            className="share-tree__item share-tree__item--doc"
          >
            {documentName}
          </button>
        ) : (
          <a href={documentHref} className="share-tree__item share-tree__item--doc">
            {documentName}
          </a>
        )}
      </li>
      {files.map((f, i) => {
        const isCurrent = currentFile !== null && f.name === currentFile;
        return (
          <li key={f.name} className="share-tree__row">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-current={isCurrent || open === i ? "true" : undefined}
              className="share-tree__item share-tree__item--file"
            >
              {f.name}
            </button>
            <a
              href={f.pageUrl}
              className="share-tree__open"
              aria-label={`Open ${f.name} as page`}
              title="Open as page"
            >
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Two renderings of one list, with CSS choosing: a plain nav in the
          pane on desktop, a collapsed <details> below 900px — where a phone
          would otherwise meet three hundred pixels of file list before the
          document. Same trick, and same reason, as the contents pane. */}
      <nav aria-label="Files" className="share-tree share-tree--wide no-print">
        <p className="kicker text-ink-muted">Files</p>
        {list}
      </nav>
      <details className="share-tree share-tree--narrow no-print">
        <summary className="kicker text-ink-muted">
          Files{currentFile ? ` — ${currentFile}` : ""}
        </summary>
        <nav aria-label="Files">{list}</nav>
      </details>

      <dialog
        ref={dialog}
        className="share-dialog"
        aria-label={current ? `${current.name} — context file` : "Context file"}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
      >
        {current && (
          <div
            className="share-dialog__panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-dialog__head">
              <span className="kicker text-ink">{current.name}</span>
              <span className="share-dialog__tools">
                <a
                  href={current.pageUrl}
                  className="kicker text-ink-muted hover:text-ink"
                >
                  Open as page ↗
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="kicker text-ink-muted hover:text-ink"
                  aria-label="Close"
                >
                  Close ×
                </button>
              </span>
            </div>
            {/* The panel is the full height of the dialog; only this scrolls,
                so a wide table keeps the head and the close button in view. */}
            <div className="share-dialog__body">
              <DocumentViewer
                key={current.name}
                doc={current}
                compact
                title={current.title}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
