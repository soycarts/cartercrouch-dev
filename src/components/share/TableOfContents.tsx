"use client";

import { useEffect, useRef, useState } from "react";
import type { TocEntry } from "@/lib/share/markdown";

/** Where the reading eye is: a heading counts as "here" once it reaches this. */
const BAND = 3;
/** Above this scroll position the pane parks at its own top, not the heading. */
const TOP = 120;

/**
 * Contents pane, built from the rendered tree (see `toc` in markdown.ts)
 * rather than from the DOM. Sticky beside the prose on desktop; a collapsed
 * <details> below 900px — two renderings of the same list, with CSS choosing
 * one, which keeps both correct without a media-query round trip on first
 * paint.
 */
export function TableOfContents({ items }: { items: TocEntry[] }) {
  const [current, setCurrent] = useState<string | null>(items[0]?.id ?? null);
  const wideRef = useRef<HTMLElement>(null);

  /**
   * The pane follows the reader only where it is a pane. Below 900px the wide
   * nav is display:none and the list lives in a <details>, where scrolling
   * anything on the reader's behalf would fight the page scroll.
   */
  const onDesktop = () => {
    const nav = wideRef.current;
    return nav !== null && getComputedStyle(nav).display !== "none";
  };

  // The current heading is simply the last one above the band — computed from
  // the scroll position rather than from IntersectionObserver callbacks, which
  // could stop arriving after an anchor jump or a fast scroll and leave the
  // highlight stuck on a heading the reader left long ago.
  useEffect(() => {
    if (items.length === 0) return;
    const resolve = () => items.map((i) => document.getElementById(i.id));
    let headings = resolve();
    let raf = 0;

    const compute = () => {
      // The Reader/Markdown toggle throws the prose away and builds it again,
      // so a cached element can go stale. Re-resolve when one has.
      if (headings.some((el) => el === null || !el.isConnected)) headings = resolve();
      const band = window.innerHeight / BAND;
      // At the foot of the document the last headings can never reach the
      // band — there is nothing left to scroll — so down there the lowest
      // heading still on screen takes it instead.
      const atFoot =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const limit = atFoot ? window.innerHeight : band;
      let last: string | null = null;
      for (let n = 0; n < items.length; n += 1) {
        const el = headings[n];
        if (el && el.getBoundingClientRect().top <= limit) last = items[n].id;
      }
      setCurrent(last ?? items[0].id);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("load", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [items]);

  // At the top of the document the pane parks at its own top, so the files
  // list is visible again; the follow-the-heading logic below stays out of the
  // way while the reader is up there. Desktop only — see onDesktop.
  useEffect(() => {
    const pane = wideRef.current?.closest<HTMLElement>(".share-pane");
    if (!pane) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!onDesktop()) return;
        if (window.scrollY < TOP && pane.scrollTop > 0) pane.scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Keep the highlighted entry in view inside the sticky pane. The pane is the
  // scroll container (overflow-y: auto), so move its scrollTop directly rather
  // than scrollIntoView, which would also scroll the document.
  useEffect(() => {
    const nav = wideRef.current;
    if (!nav || !current || !onDesktop()) return;
    if (window.scrollY < TOP) return;
    const link = nav.querySelector<HTMLElement>(`a[href="#${CSS.escape(current)}"]`);
    const pane = nav.closest<HTMLElement>(".share-pane");
    if (!link || !pane || pane.scrollHeight <= pane.clientHeight) return;
    const paneBox = pane.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const margin = 48;
    if (linkBox.top < paneBox.top + margin) {
      pane.scrollTop -= paneBox.top + margin - linkBox.top;
    } else if (linkBox.bottom > paneBox.bottom - margin) {
      pane.scrollTop += linkBox.bottom - (paneBox.bottom - margin);
    }
  }, [current]);

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
      <nav aria-label="Contents" className="share-toc__wide" ref={wideRef}>
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
