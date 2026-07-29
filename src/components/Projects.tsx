import Image from "next/image";
import { projects } from "@/lib/data";
import { Section } from "./Section";

export function Projects() {
  return (
    // Breaks out of the label rail so the grid gets the full measure — this
    // list is meant to be scanned, and it grows as projects are added.
    <Section id="projects" eyebrow="Work" wide>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <article key={p.name} className="flex flex-col">
            {p.image ? (
              <div className="relative aspect-[16/10] border border-rule bg-paper-raised">
                <Image
                  src={p.image}
                  alt={`Screenshot of ${p.name}`}
                  fill
                  sizes="(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover object-top"
                />
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center border border-rule bg-paper-raised">
                <span className="text-[1.4rem] text-ink-muted">{p.name}</span>
              </div>
            )}

            <h3 className="mt-4 text-[1.2rem]">{p.name}</h3>

            <p className="kicker mt-1.5 text-ink-muted">{p.tags.join(" · ")}</p>

            <p className="mt-2.5 line-clamp-2 text-[0.85rem] leading-relaxed text-ink-soft">
              {p.description}
            </p>

            {/* mt-auto pins the links to the card's bottom edge so they line
                up across a row even when descriptions clamp to different
                line counts. */}
            <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-4">
              {p.website && (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-mono"
                >
                  Website
                </a>
              )}
              {p.github && (
                <a
                  href={p.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-mono"
                >
                  GitHub
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
