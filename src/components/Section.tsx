type SectionProps = {
  id: string;
  /** Mono label that sits in the left rail. Doubles as the section's heading —
   *  the rail label *is* the title in this layout, so there's no second,
   *  larger one to duplicate it. */
  eyebrow: string;
  /** Optional second line under the eyebrow — a date, a status, a count. */
  meta?: React.ReactNode;
  /** Let children span the full shell width, with the label stacked above
   *  instead of beside. For grids that need the room the rail would eat. */
  wide?: boolean;
  children: React.ReactNode;
};

// Every section on the page runs through here: hairline rule on top, mono
// label in the left rail, content in the right column.
export function Section({ id, eyebrow, meta, wide, children }: SectionProps) {
  const label = (
    <div>
      <h2 className="kicker text-ink">{eyebrow}</h2>
      {meta && <div className="kicker mt-1.5 text-ink-muted">{meta}</div>}
    </div>
  );

  return (
    <section id={id} className="shell scroll-mt-8 border-t border-rule">
      {wide ? (
        // Label still starts at the shell's left edge, so it lines up with
        // every rail label above and below it.
        <div className="py-8 sm:py-12">
          <div className="mb-7">{label}</div>
          {children}
        </div>
      ) : (
        <div className="rail py-8 sm:py-12">
          {label}
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </section>
  );
}
