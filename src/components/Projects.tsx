import { projects } from "@/lib/data";
import { GitHubIcon, GlobeIcon } from "./icons";
import { Section } from "./Section";

export function Projects() {
  return (
    <Section id="projects" eyebrow="01 / Work" title="Things I've built">
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
        {projects.map((p) => (
          <div key={p.name} className="group flex flex-col">
            {/* Preview banner — swap the gradient for a real screenshot any time. */}
            <div
              className={`flex h-44 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} shadow-sm transition group-hover:shadow-md`}
            >
              <span className="px-4 text-center text-2xl font-semibold tracking-tight text-white drop-shadow-sm">
                {p.name}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-bold">{p.name}</h3>

            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-foreground/60">
              {p.description}
            </p>

            <ul className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-md bg-black/[0.05] px-2.5 py-1 text-xs text-foreground/70 dark:bg-white/10"
                >
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {p.website && (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-xs font-medium text-background transition hover:opacity-90"
                >
                  <GlobeIcon className="h-4 w-4" />
                  Website
                </a>
              )}
              {p.github && (
                <a
                  href={p.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-3.5 py-2 text-xs font-medium text-foreground/80 transition hover:border-accent/50 hover:text-foreground dark:border-white/15"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Github
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
