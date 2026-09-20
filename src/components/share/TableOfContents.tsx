"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/share/markdown";

/**
 * Contents pane for the main document, built from the rendered tree (see
 * `toc` in markdown.ts) rather than from the DOM. Sticky beside the prose on
 * desktop; a collapsed <details> below 900px — two renderings of the same
 * list, with CSS choosing one, which keeps both correct without a
 * media-query round trip on first paint.
 */
export function TableOfContents({ items }: { items: TocEntry[] }) {
  const [current, setCurrent] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0 || typeof IntersectionObserver === "undefined") return;
    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // Only the top third of the viewport counts as "here".
    const band = () => window.innerHeight / 3;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = items.find((i) => visible.has(i.id));
        if (first) {
          setCurrent(first.id);
          return;
        }
        // Nothing in the band — either a long section, or a jump that
        // crossed several headings between callbacks. The heading the
        // reader is under is the last one above the band.
        let last: string | null = null;
        for (const item of items) {
          const el = document.getElementById(item.id);
          if (el && el.getBoundingClientRect().top < band()) last = item.id;
        }
        setCurrent(last ?? items[0].id);
      },
      { rootMargin: "0px 0px -67% 0px", threshold: 0 },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const list = (
    <ul className="share-toc__list">
      {items.map((item) => (
        <li key={item.id} className={`share-toc__item share-toc__item--h${item.depth}`}>
          <a
            href={`#${item.id}`}
            className={`share-toc__link ${current === item.id ? "is-current" : ""}`}
            aria-current={current === item.id ? "location" : undefined}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="share-toc no-print">
      <nav aria-label="Contents" className="share-toc__wide">
        <p className="kicker text-ink-muted">Contents</p>
        {list}
      </nav>
      <details className="share-toc__narrow">
        <summary className="kicker text-ink-muted">Contents</summary>
        <nav aria-label="Contents">{list}</nav>
      </details>
    </div>
  );
}
