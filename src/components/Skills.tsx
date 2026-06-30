import { skills } from "@/lib/data";
import { Section } from "./Section";

export function Skills() {
  return (
    <Section id="skills" eyebrow="03 / Stack" title="Skills & technologies">
      <ul className="flex flex-wrap gap-3">
        {skills.map((s) => (
          <li
            key={s}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-foreground/75 transition hover:border-accent/40 hover:text-foreground"
          >
            {s}
          </li>
        ))}
      </ul>
    </Section>
  );
}
