type SectionProps = {
  id: string;
  /** Mono label that sits in the left rail, e.g. "01 / Work". Doubles as the
   *  section's heading — the rail label *is* the title in this layout, so
   *  there's no second, larger one to duplicate it. */
  eyebrow: string;
  /** Optional second line under the eyebrow — a date, a status, a count. */
  meta?: React.ReactNode;
  children: React.ReactNode;
};

// Every section on the page runs through here: hairline rule on top, mono
// label in the left rail, content in the right column.
export function Section({ id, eyebrow, meta, children }: SectionProps) {
  return (
    <section id={id} className="shell scroll-mt-8 border-t border-rule">
      <div className="rail py-14 sm:py-20">
        <div>
          <h2 className="kicker text-ink">{eyebrow}</h2>
          {meta && <div className="kicker mt-1.5 text-ink-muted">{meta}</div>}
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
