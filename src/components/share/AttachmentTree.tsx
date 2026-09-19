"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentViewer, type ViewerDocument } from "./DocumentViewer";

export type ViewerAttachment = ViewerDocument & { name: string; title: string | null };

/**
 * File tree: the document itself first (current, closes any popup), then
 * its context files indented beneath. Clicking a context file opens it in a
 * popup viewer. Hidden entirely when there are no attachments.
 */
export function AttachmentTree({
  documentName,
  files,
}: {
  documentName: string;
  files: ViewerAttachment[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  if (files.length === 0) return null;
  const current = open === null ? null : files[open];

  return (
    <>
      <nav aria-label="Files" className="share-tree no-print">
        <p className="kicker text-ink-muted">Files</p>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-current={open === null ? "true" : undefined}
              className="share-tree__item share-tree__item--doc"
            >
              {documentName}
            </button>
          </li>
          {files.map((f, i) => (
            <li key={f.name}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-current={open === i ? "true" : undefined}
                className="share-tree__item share-tree__item--file"
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <dialog
        ref={dialog}
        className="share-dialog"
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
      >
        {current && (
          <div className="share-dialog__panel" onClick={(e) => e.stopPropagation()}>
            <div className="share-dialog__head">
              <span className="kicker text-ink">{current.name}</span>
              <button type="button" onClick={() => setOpen(null)} className="kicker text-ink-muted hover:text-ink" aria-label="Close">
                Close ×
              </button>
            </div>
            <DocumentViewer key={current.name} doc={current} compact />
          </div>
        )}
      </dialog>
    </>
  );
}
