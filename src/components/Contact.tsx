import { profile, socials } from "@/lib/data";
import { socialIcons } from "./icons";

export function Contact() {
  const x = socials.find((s) => s.label === "X");

  return (
    <section
      id="contact"
      className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32"
    >
      <p className="mb-2 font-mono text-sm text-accent">04 / Contact</p>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        Let&apos;s build something
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-lg text-foreground/60">
        Have an idea, a role, or just want to say hi? The fastest way to reach me
        is a DM on X — or drop me an email.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {x && (
          <a
            href={x.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-black transition hover:bg-accent/90"
          >
            DM me on X
          </a>
        )}
        <a
          href={`mailto:${profile.email}`}
          className="rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-foreground/80 transition hover:border-accent/40 hover:text-foreground"
        >
          {profile.email}
        </a>
      </div>

      <div className="mt-12 flex items-center justify-center gap-5">
        {socials.map((s) => {
          const Icon = socialIcons[s.label];
          return (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 transition hover:text-accent"
              aria-label={s.label}
            >
              {Icon ? <Icon className="h-6 w-6" /> : s.label}
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-foreground/40 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p className="font-mono text-xs">Built with Next.js & Tailwind</p>
      </div>
    </footer>
  );
}
