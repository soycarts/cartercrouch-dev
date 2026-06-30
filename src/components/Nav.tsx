import Link from "next/link";
import { profile, socials } from "@/lib/data";
import { socialIcons } from "./icons";

const links = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="#top"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-mono text-sm font-semibold text-accent transition hover:border-accent/40"
          aria-label={profile.name}
        >
          {profile.initials}
        </Link>

        <ul className="hidden items-center gap-7 text-sm text-foreground/70 sm:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {socials.map((s) => {
            const Icon = socialIcons[s.label];
            return (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 transition hover:text-accent"
                aria-label={s.label}
              >
                {Icon ? <Icon className="h-[18px] w-[18px]" /> : s.label}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
