"use client";

import { useEffect, useState } from "react";

// The one client component on share.carter.md. Copies `value` and flips its
// label briefly; falls back to selecting nothing rather than throwing when
// the clipboard API is unavailable (plain http, old WebViews).
export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  className = "",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          window.prompt("Copy:", value);
        }
      }}
      className={`link-mono link-mono--copy cursor-pointer text-ink ${copied ? "text-accent" : ""} ${className}`}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
