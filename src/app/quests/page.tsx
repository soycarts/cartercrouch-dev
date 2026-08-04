import type { Metadata } from "next";
import {
  quests,
  questCategories,
  type QuestStatus,
} from "@/lib/data";
import { Section } from "@/components/Section";
import { Footer } from "@/components/Contact";

export const metadata: Metadata = {
  title: "Quests — Carter Crouch",
  description:
    "A quest board — running, queued, and completed. Inspired by thomas.md/quests.",
};

// Status chips: queued fades back, running takes the accent tint, completed
// flips to a filled ink chip. Square corners, per the house style.
const statusStyle: Record<QuestStatus, string> = {
  running: "bg-accent/10 text-accent",
  queued: "bg-ink/5 text-ink-muted",
  completed: "bg-ink text-paper",
};

function StatusBadge({ status }: { status: QuestStatus }) {
  return (
    <span
      className={`kicker inline-block shrink-0 px-2 py-1 ${statusStyle[status]}`}
    >
      {status}
    </span>
  );
}

export default function Quests() {
  const counts = (["queued", "running", "completed"] as const).map(
    (status) => ({
      status,
      count: quests.filter((q) => q.status === status).length,
    }),
  );

  return (
    <>
      <main className="flex-1">
        <div className="shell py-10 sm:py-14">
          <h1 className="max-w-[16ch] text-[2rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.4rem]">
            Quests
          </h1>
          <p className="mt-3 text-[0.8rem] text-ink-muted">
            Inspired by{" "}
            <a
              href="https://thomas.md/quests"
              target="_blank"
              rel="noopener noreferrer"
              className="link-text"
            >
              thomas.md/quests
            </a>
            .
          </p>
          {/* Aggregate tally, as on the quest board that inspired this. */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {counts.map(({ status, count }) => (
              <span key={status} className="flex items-baseline gap-2">
                <StatusBadge status={status} />
                <span className="kicker text-ink-soft tabular-nums">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>

        {questCategories.map((category) => {
          const items = quests.filter((q) => q.category === category);
          if (items.length === 0) return null;
          return (
            <Section
              key={category}
              id={`quests-${category.toLowerCase()}`}
              eyebrow={category}
              meta={`${items.length} quest${items.length === 1 ? "" : "s"}`}
              wide
            >
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((q) => (
                  <li
                    key={q.title}
                    className="flex flex-col gap-2.5 border border-rule bg-paper-raised p-3.5"
                  >
                    <span className="text-[0.95rem] leading-snug">
                      {q.title}
                    </span>
                    {/* mt-auto pins the chip to the card's bottom edge so it
                        lines up across a row even when titles wrap. */}
                    <div className="mt-auto">
                      <StatusBadge status={q.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
