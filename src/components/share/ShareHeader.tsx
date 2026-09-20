import { formatDate, onDifferentDays } from "@/lib/share/dates";

// Title block: date kicker, the document's H1, and its lede line.
export function ShareHeader({
  title,
  updatedAt,
  createdAt,
  href = null,
}: {
  title: string | null;
  createdAt: string;
  updatedAt: string;
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
