"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profile } from "@/lib/data";
import { FileIcon } from "./icons";

function useTypewriter(words: string[]) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      // Pause on the full word before deleting.
      timeout = setTimeout(() => setDeleting(true), 1600);
    } else if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
    } else {
      timeout = setTimeout(
        () => {
          const next = deleting
            ? current.slice(0, text.length - 1)
            : current.slice(0, text.length + 1);
          setText(next);
        },
        deleting ? 45 : 90,
      );
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, index, words]);

  return text;
}

export function Hero() {
  const role = useTypewriter(profile.roles);

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
            <span>{role}</span>
            <span className="caret ml-0.5 font-light text-accent">|</span>
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground/50">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {profile.location}
          </p>
        </div>

        <div
          aria-hidden
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-sky-400 font-mono text-3xl font-semibold text-white shadow-lg shadow-accent/20 sm:h-32 sm:w-32"
        >
          {profile.initials}
        </div>
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
