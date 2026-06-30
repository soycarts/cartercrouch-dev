import { projects } from "@/lib/data";
import { ArrowIcon } from "./icons";
import { Section } from "./Section";

export function Projects() {
  return (
    <Section id="projects" eyebrow="01 / Work" title="Things I've built">
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
              className="group relative flex flex-col rounded-2xl border border-black/10 bg-black/[0.015] p-5 transition hover:border-accent/40 hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
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
                    className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 font-mono text-xs text-foreground/60 dark:border-white/10 dark:bg-white/5"
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
