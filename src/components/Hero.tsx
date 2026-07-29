import Link from "next/link";
import Image from "next/image";
import { profile, socials } from "@/lib/data";

export function Hero() {
  const x = socials.find((s) => s.label === "X");

  return (
    <section id="top" className="shell">
      {/* Stacked on mobile the name leads and the portrait closes the block;
          side by side from sm up. */}
      <div className="animate-fade-up flex flex-col gap-8 pt-10 pb-12 sm:flex-row sm:items-start sm:justify-between sm:gap-16 sm:pt-14 sm:pb-16">
        <div className="min-w-0 flex-1">
          <h1 className="text-[3rem] leading-[0.95] sm:text-[4.2rem]">
            {profile.name}
          </h1>

          <p className="mt-4 max-w-[36ch] text-[1.3rem] leading-tight text-ink-soft sm:text-[1.55rem]">
            {profile.tagline}
          </p>

          <p className="kicker mt-4 inline-flex items-center gap-2.5 text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {profile.location}
          </p>

          {/* The bio, verbatim, set as a margin note rather than a body block. */}
          <div className="mt-7 max-w-[62ch] border-l border-rule pl-6">
            <p className="text-[0.86rem] leading-relaxed text-ink-soft">
              {profile.bio}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href="#projects" className="link-mono link-mono--down">
              View work
            </Link>
            {x && (
              <a
                href={x.href}
                target="_blank"
                rel="noopener noreferrer"
                className="link-mono"
              >
                DM on X
              </a>
            )}
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-mono"
            >
              Résumé
            </a>
          </div>
        </div>

        <figure className="shrink-0">
          <Image
            src={profile.avatar}
            alt={profile.name}
            width={256}
            height={256}
            priority
            className="h-32 w-32 border border-rule bg-paper-raised object-cover sm:h-44 sm:w-44"
          />
          <figcaption className="kicker mt-2.5 text-ink-muted">
            {profile.role}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
