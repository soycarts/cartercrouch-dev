import { skills } from "@/lib/data";
import { Section } from "./Section";

export function Skills() {
  return (
    <Section id="skills" eyebrow="Stack">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {skills.map((s) => (
          <li key={s} className="kicker text-ink-soft">
            {s}
          </li>
        ))}
      </ul>
    </Section>
  );
}
