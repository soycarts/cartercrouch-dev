import Link from "next/link";
import { Section } from "./Section";

// Front-page teaser only — the quest list itself lives at /quests.
export function Quests() {
  return (
    <Section id="quests" eyebrow="Quests">
      <p className="max-w-[46ch] text-[1.05rem] leading-relaxed text-ink-soft">
        A life list of quests — running, queued, and completed.
      </p>
      <Link href="/quests" className="link-mono link-mono--in mt-5">
        View the quest log
      </Link>
    </Section>
  );
}
