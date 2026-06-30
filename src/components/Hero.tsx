"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profile } from "@/lib/data";

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
      className="mx-auto flex min-h-[88vh] max-w-5xl flex-col justify-center px-6 py-24"
    >
      <div className="animate-fade-up">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/70">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {profile.location}
        </p>

        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          Hi, I&apos;m{" "}
          <span className="text-accent">{profile.name}</span>
        </h1>

        <p className="mt-6 text-2xl font-medium text-foreground/80 sm:text-3xl">
          <span>{role}</span>
          <span className="caret ml-0.5 font-light text-accent">|</span>
        </p>

        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/60">
          {profile.bio}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="#projects"
            className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-black transition hover:bg-accent/90"
          >
            View my work
          </Link>
          <Link
            href="#contact"
            className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-foreground/80 transition hover:border-accent/40 hover:text-foreground"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </section>
  );
}
