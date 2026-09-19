import type { RenderedSection } from "@/lib/share/markdown";

// Sections rendered with the site's rail motif: number + heading on the left,
// body on the right. The lede (content before the first H2) has no label.
// `html` is sanitized upstream (remark-rehype without raw HTML, then
// rehype-sanitize), which is the only reason dangerouslySetInnerHTML is safe.
export function Prose({ sections }: { sections: RenderedSection[] }) {
  return (
    <article className="prose-share">
      {sections.map((section, i) => (
        <section
          key={section.id ?? `lede-${i}`}
          id={section.id ?? undefined}
          className={`rail share-section ${section.number ? "border-t border-rule py-8 sm:py-10" : "pb-8 sm:pb-10"}`}
        >
          {section.number ? (
            <h2 className="kicker text-ink">
              <span className="text-ink-muted">
                {String(section.number).padStart(2, "0")} /
              </span>{" "}
              {section.heading}
            </h2>
          ) : (
            <div aria-hidden className="hidden sm:block" />
          )}
          <div
            className="prose-body min-w-0"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </section>
      ))}
    </article>
  );
}
