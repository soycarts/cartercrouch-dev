import { skills } from "@/lib/data";
import { Section } from "./Section";

export function Skills() {
  return (
    <Section id="skills" eyebrow="02 / Stack" title="Skills & technologies">
      <ul className="flex flex-wrap gap-2.5">
        {skills.map((s) => (
          <li
            key={s}
            className="rounded-lg border border-black/10 bg-black/[0.02] px-3.5 py-1.5 text-sm text-foreground/75 transition hover:border-accent/40 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
          >
            {s}
          </li>
        ))}
      </ul>
    </Section>
  );
}
