import { projects } from "@/lib/data";
import { ArrowIcon } from "./icons";
import { Section } from "./Section";

export function Projects() {
  return (
    <Section id="projects" eyebrow="02 / Work" title="Things I've built">
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.map((p) => {
          const Wrapper = p.href ? "a" : "div";
          return (
            <Wrapper
              key={p.name}
              {...(p.href
                ? {
                    href: p.href,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  }
                : {})}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-accent/30 hover:bg-white/[0.04]"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-foreground">
                  {p.name}
                </h3>
                {p.href && (
                  <ArrowIcon className="h-5 w-5 text-foreground/40 transition group-hover:text-accent" />
                )}
              </div>

              <p className="flex-1 text-sm leading-relaxed text-foreground/60">
                {p.description}
              </p>

              <ul className="mt-5 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-foreground/60"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </Wrapper>
          );
        })}
      </div>
    </Section>
  );
}
