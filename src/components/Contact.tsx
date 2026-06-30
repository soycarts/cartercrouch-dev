import { profile, socials } from "@/lib/data";
import { socialIcons } from "./icons";

export function Contact() {
  const x = socials.find((s) => s.label === "X");

  return (
    <section
      id="contact"
      className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-16"
    >
      <p className="mb-1 font-mono text-xs text-accent">03 / Contact</p>
      <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
        Let&apos;s build something
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-foreground/60">
        Have an idea, a role, or just want to say hi? The fastest way to reach me
        is a DM on X.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {x && (
          <a
            href={x.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:text-black"
          >
            DM me on X
          </a>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-5">
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
              {Icon ? <Icon className="h-5 w-5" /> : s.label}
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/5">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-6 pt-6 pb-28 text-sm text-foreground/40 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p className="font-mono text-xs">Built with Next.js & Tailwind</p>
      </div>
    </footer>
  );
}
