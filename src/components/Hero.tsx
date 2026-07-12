import Link from "next/link";
import Image from "next/image";
import { profile } from "@/lib/data";
import { FileIcon } from "./icons";

export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto max-w-3xl px-6 pt-24 pb-12 sm:pt-28"
    >
      <div className="animate-fade-up flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Hi, I&apos;m <span className="text-accent">Carter</span>
          </h1>
          <p className="mt-3 text-xl font-medium text-foreground/60 sm:text-2xl">
            {profile.tagline}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground/50">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {profile.location}
          </p>
        </div>

        <Image
          src={profile.avatar}
          alt={profile.name}
          width={256}
          height={256}
          priority
          className="h-28 w-28 shrink-0 rounded-full object-cover shadow-lg shadow-accent/20 ring-1 ring-black/5 sm:h-32 sm:w-32 dark:ring-white/10"
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-2 text-lg font-bold">About</h2>
        <p className="max-w-2xl leading-relaxed text-foreground/60">
          {profile.bio}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="#projects"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:text-black"
          >
            View my work
          </Link>
          <Link
            href="#contact"
            className="rounded-lg border border-black/15 px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:border-accent/50 hover:text-foreground dark:border-white/15"
          >
            Get in touch
          </Link>
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:border-accent/50 hover:text-foreground dark:border-white/15"
          >
            <FileIcon className="h-4 w-4" />
            Resume
          </a>
        </div>
      </div>
    </section>
  );
}
