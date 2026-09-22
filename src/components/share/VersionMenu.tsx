"use client";

import { useEffect, useId, useRef, useState } from "react";

export type VersionOption = {
  /** The owner's label for the draft, e.g. "1.1". */
  label: string;
  /** Where this entry goes: the same file in that draft, or its document. */
  href: string;
  /** The live draft — the one the bare URL serves. */
  current: boolean;
  /** The draft being read right now. */
  active: boolean;
};

/**
 * The third control on the share bar, beside Reader and Markdown: which
 * draft you are reading, and a way into the others.
 *
 * A popover rather than more tabs — a document with six drafts would push
 * the bar onto a second row, and the list is a navigation, not a mode. The
 * button carries the *shown* draft's label, so an archived page says so
 * before the reader has scrolled anywhere.
 */
export function VersionMenu({ label, versions }: { label: string; versions: VersionOption[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Click-away and Escape, the two things every popover owes its reader.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="share-versions" ref={root}>
      <button
        type="button"
        className={`share-tab share-versions__button ${open ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        title="Choose a draft"
        onClick={() => setOpen((was) => !was)}
      >
        Draft {label}
        <span className="share-versions__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="share-versions__menu" id={menuId} role="menu" aria-label="Drafts">
          {versions.map((v) => (
            <a
              key={v.href}
              href={v.href}
              role="menuitem"
              aria-current={v.active ? "true" : undefined}
              className={`share-versions__item ${v.active ? "is-active" : ""}`}
            >
              <span className="share-versions__label">Draft {v.label}</span>
              {v.current && <span className="share-versions__tag">current</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
