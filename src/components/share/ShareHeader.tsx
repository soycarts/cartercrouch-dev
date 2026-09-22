import { formatDate, onDifferentDays } from "@/lib/share/dates";

// Title block: date kicker, the document's H1, and its lede line.
export function ShareHeader({
  title,
  updatedAt,
  createdAt,
  href = null,
  versionLabel = null,
  superseded = null,
  diffLink = null,
}: {
  title: string | null;
  createdAt: string;
  updatedAt: string;
  /** The draft being read, e.g. "1.0". */
  versionLabel?: string | null;
  /** Set only on an archived draft: when it was replaced, and by what. */
  superseded?: { at: string; currentHref: string } | null;
  /** The diff-vs-live control, a link either way: on or off. */
  diffLink?: { on: boolean; href: string } | null;
  /**
   * Canonical URL of the thing being titled. Given one, the H1 becomes the
   * share link itself — the most obvious place to grab it from. Omitted for
   * the print view and the attachment popup, where a link leads nowhere
   * useful.
   */
  href?: string | null;
}) {
  const created = formatDate(createdAt);
  // Compared as the owner sees them, not as UTC slices them.
  const updated = onDifferentDays(updatedAt, createdAt) ? formatDate(updatedAt) : null;
  const text = title ?? "Untitled document";
  return (
    <div className="pt-10 pb-6 sm:pt-14 sm:pb-8">
      <div className="kicker flex flex-wrap items-baseline gap-x-4 gap-y-1 text-ink-muted">
        <span>{created}</span>
        {updated && <span>Updated {updated}</span>}
      </div>
      {/* Reading an old draft should never be a thing you discover late.
          Same meta line, one notch louder, directly under the dates. */}
      {superseded && (
        <p className="kicker share-superseded mt-2">
          <span>Draft {versionLabel ?? "—"}</span>
          <span aria-hidden="true">·</span>
          <span>superseded {formatDate(superseded.at)}</span>
          {diffLink && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={diffLink.href}
                className={`share-superseded__link share-superseded__diff ${diffLink.on ? "is-active" : ""}`}
                aria-pressed={diffLink.on}
                title={diffLink.on ? "Back to the draft as written" : "Show only what changed since this draft"}
              >
                {diffLink.on ? "Diff vs live ✓" : "Diff vs live"}
              </a>
            </>
          )}
          <span aria-hidden="true">·</span>
          <a href={superseded.currentHref} className="share-superseded__link">
            Current draft →
          </a>
        </p>
      )}
      {/* The lifted H1, rendered once, here — never again in the body. */}
      <h1 className="share-title mt-4">
        {href ? (
          <a href={href} className="share-title__link" title="Link to this document">
            {text}
          </a>
        ) : (
          text
        )}
      </h1>
    </div>
  );
}
