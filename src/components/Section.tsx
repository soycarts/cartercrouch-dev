type SectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

export function Section({ id, eyebrow, title, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-3xl px-6 py-10 sm:py-12">
      <div className="mb-6">
        <p className="mb-1 font-mono text-xs text-accent">{eyebrow}</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
