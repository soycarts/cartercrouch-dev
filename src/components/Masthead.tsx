import Link from "next/link";
import { socials } from "@/lib/data";

const nav = [
  { label: "Now", href: "#now" },
  { label: "Work", href: "#projects" },
  { label: "Writing", href: "#writing" },
  { label: "Stack", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

// Top masthead, replacing the old floating dock. Deliberately server-only:
// the mobile menu is a <details> disclosure, so the whole site ships zero
// client JavaScript.
export function Masthead() {
  const x = socials.find((s) => s.label === "X");

  return (
    <header className="shell">
      <div className="flex items-start justify-between gap-8 border-b border-rule pt-6 pb-5">
        <Link
          href="#top"
          aria-label="Back to top"
          className="font-mono text-[1.6rem] leading-none tracking-tight"
        >
          CC
        </Link>

        {/* Wide viewports: the full index. */}
        <nav className="hidden items-baseline gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:justify-end">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="kicker text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          {x && (
            <a
              href={x.href}
              target="_blank"
              rel="noopener noreferrer"
              className="kicker border-b border-current pb-0.5 text-accent"
            >
              X ↗
            </a>
          )}
        </nav>

        {/* Narrow viewports: a CSS-only disclosure. */}
        <details className="group relative sm:hidden">
          <summary className="kicker flex cursor-pointer list-none items-center text-ink-muted after:ml-1.5 after:content-['+'] group-open:text-accent group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">
            Index
          </summary>
          <div className="absolute top-9 right-0 z-50 w-52 border border-rule bg-paper-raised p-1.5 shadow-[0_14px_36px_rgba(1,22,20,0.09)]">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="kicker block px-3 py-2.5 text-ink-muted transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            {x && (
              <a
                href={x.href}
                target="_blank"
                rel="noopener noreferrer"
                className="kicker block px-3 py-2.5 text-accent"
              >
                X ↗
              </a>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
