import Link from "next/link";
import { Section } from "./Section";

// Front-page teaser only — the quest list itself lives at /quests.
export function Quests() {
  return (
    <Section id="quests" eyebrow="Quests">
      <Link href="/quests" className="link-mono link-mono--in">
        View quests
      </Link>
    </Section>
  );
}
