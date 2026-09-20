// Title block: date kicker, the document's H1, and its lede line.
export function ShareHeader({
  title,
  updatedAt,
  createdAt,
}: {
  title: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  const created = formatDate(createdAt);
  const updated = updatedAt.slice(0, 10) !== createdAt.slice(0, 10) ? formatDate(updatedAt) : null;
  return (
    <div className="pt-10 pb-6 sm:pt-14 sm:pb-8">
      <div className="kicker flex flex-wrap items-baseline gap-x-4 gap-y-1 text-ink-muted">
        <span>{created}</span>
        {updated && <span>Updated {updated}</span>}
      </div>
      {/* The lifted H1, rendered once, here — never again in the body. */}
      <h1 className="share-title mt-4">{title ?? "Untitled document"}</h1>
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}
