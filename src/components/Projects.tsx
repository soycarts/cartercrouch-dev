import Image from "next/image";
import { projects } from "@/lib/data";
import { Section } from "./Section";

export function Projects() {
  return (
    <Section id="projects" eyebrow="01 / Work">
      <div className="border-t border-rule-strong">
        {projects.map((p) => (
          <article
            key={p.name}
            className="grid gap-x-8 gap-y-4 border-b border-rule py-8 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
          >
            <div>
              <h3 className="text-[1.45rem]">{p.name}</h3>
              <p className="kicker mt-2 text-ink-muted">
                {p.tags.join(" · ")}
              </p>
            </div>

            <div className="min-w-0">
              <p className="max-w-[58ch] text-[0.92rem] leading-relaxed text-ink-soft">
                {p.description}
              </p>

              {p.image ? (
                <div className="relative mt-5 aspect-[16/7] border border-rule bg-paper-raised">
                  <Image
                    src={p.image}
                    alt={`Screenshot of ${p.name}`}
                    fill
                    sizes="(min-width: 768px) 640px, 100vw"
                    className="object-cover object-top"
                  />
                </div>
              ) : (
                <div className="mt-5 flex aspect-[16/7] items-center justify-center border border-rule bg-paper-raised">
                  <span className="text-[1.6rem] text-ink-muted">{p.name}</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
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
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
