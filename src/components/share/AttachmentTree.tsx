"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentViewer, type ViewerDocument } from "./DocumentViewer";

export type ViewerAttachment = ViewerDocument & { name: string; title: string | null };

/** File tree of context files; clicking one opens it in a popup viewer. */
export function AttachmentTree({ files }: { files: ViewerAttachment[] }) {
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
      <nav aria-label="Context files" className="share-tree no-print">
        <p className="kicker text-ink-muted">Files</p>
        <ul>
          {files.map((f, i) => (
            <li key={f.name}>
              <button type="button" onClick={() => setOpen(i)} className="share-tree__item">
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
