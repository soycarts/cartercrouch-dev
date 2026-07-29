import { profile, socials } from "@/lib/data";
import { socialIcons } from "./icons";
import { Section } from "./Section";

export function Contact() {
  const x = socials.find((s) => s.label === "X");

  return (
    <Section id="contact" eyebrow="Contact">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:gap-14">
        <div>
          {/* Display text, not a heading — the rail label is this section's
              heading, so this stays a paragraph to keep the outline clean. */}
          <p className="max-w-[16ch] text-[2rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.4rem]">
            Let&apos;s build something
          </p>
          <p className="mt-4 max-w-[42ch] text-[1.05rem] leading-relaxed text-ink-soft">
            Have an idea, a role, or just want to say hi? The fastest way to
            reach me is a DM on X.
          </p>
          {x && (
            <a
              href={x.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-mono mt-6"
            >
              DM me on X
            </a>
          )}
        </div>

        {/* Handles live in data.ts and were never rendered before — the
            editorial layout has room to show them. */}
        <ul className="border-t border-rule lg:border-t-0 lg:border-l lg:border-rule lg:pl-8">
          {socials.map((s) => {
            const Icon = socialIcons[s.label];
            return (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 border-b border-rule py-2.5 transition-colors hover:text-accent"
                >
                  <span className="flex items-center gap-3">
                    {Icon && <Icon className="h-3.5 w-3.5 text-ink-muted" />}
                    <span className="text-[0.95rem]">{s.label}</span>
                  </span>
                  <span className="kicker text-ink-muted">{s.handle}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="shell border-t border-rule">
      <div className="flex flex-col justify-between gap-2 py-6 sm:flex-row">
        <p className="kicker text-ink-muted">
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p className="kicker text-ink-muted">Next.js · Tailwind · Vercel</p>
      </div>
    </footer>
  );
}
