import { now } from "@/lib/data";
import { Section } from "./Section";

const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function Now() {
  // The section stays hidden while the copy in data.ts is still placeholder
  // text — a visible "TODO" reads worse than no Now section at all. Delete the
  // TODO markers there and this renders automatically.
  const isPlaceholder =
    now.lede.includes("TODO") || now.items.every((i) => i.text.includes("TODO"));
  if (isPlaceholder) return null;

  const visible = now.items.filter((i) => !i.text.includes("TODO"));

  // `updated` is a bare "YYYY-MM"; pin it to the 1st so it parses as UTC.
  const updated = new Date(`${now.updated}-01T00:00:00Z`);

  return (
    <Section
      id="now"
      eyebrow="Now"
      meta={<time dateTime={now.updated}>{monthFormat.format(updated)}</time>}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:gap-16">
        <p className="max-w-[34ch] text-[1.15rem] leading-relaxed">
          {now.lede}
        </p>

        <div className="border-l border-rule pl-6">
          <p className="kicker text-ink-muted">Currently</p>
          <ul className="mt-3 space-y-2">
            {visible.map((item) => (
              <li
                key={item.text}
                className="relative pl-5 text-[0.88rem] leading-relaxed text-ink-soft before:absolute before:left-0 before:text-ink-muted before:content-['—']"
              >
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-text"
                  >
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
