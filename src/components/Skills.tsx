import { skills } from "@/lib/data";
import { Section } from "./Section";

export function Skills() {
  return (
    <Section id="skills" eyebrow="03 / Stack">
      <ul className="grid border-t border-rule sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s, i) => (
          <li
            key={s}
            className="flex items-baseline gap-3 border-b border-rule py-3 pr-6"
          >
            <span className="kicker text-ink-muted tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.95rem]">{s}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
