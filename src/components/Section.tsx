type SectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

export function Section({ id, eyebrow, title, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
      <div className="mb-12">
        <p className="mb-2 font-mono text-sm text-accent">{eyebrow}</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
