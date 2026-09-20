import type { RenderedSection } from "@/lib/share/markdown";

// One column of prose, Obsidian-style: every heading is a real heading in the
// flow (no numbered rail, no label column), and each H2 opens a <section> so
// print breaks and the contents pane have something to hold on to.
// `html` is sanitized upstream (remark-rehype without raw HTML, then
// rehype-sanitize), which is the only reason dangerouslySetInnerHTML is safe.
export function Prose({ sections }: { sections: RenderedSection[] }) {
  return (
    <article className="prose-share">
      {sections.map((section, i) => (
        <section
          key={section.id ?? `lede-${i}`}
          className="share-section"
          aria-labelledby={section.id ?? undefined}
        >
          <div
            className="prose-body min-w-0"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </section>
      ))}
    </article>
  );
}
