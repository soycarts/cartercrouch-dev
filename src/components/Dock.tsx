"use client";

import { useEffect, useRef, useState } from "react";
import { socials } from "@/lib/data";
import {
  FolderIcon,
  HomeIcon,
  MoonIcon,
  SunIcon,
  socialIcons,
} from "./icons";

type DockItem = {
  label: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  href?: string;
  external?: boolean;
  onClick?: () => void;
};

// macOS-style magnification: icons closest to the cursor grow the most.
const MAX_SCALE = 1.7;
const RANGE = 130;

export function Dock() {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setIsDark(next);
  }

  function handleMove(e: React.MouseEvent) {
    const x = e.clientX;
    for (const el of itemRefs.current) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(x - center);
      const scale =
        dist > RANGE ? 1 : 1 + (MAX_SCALE - 1) * (1 - dist / RANGE);
      el.style.transform = `scale(${scale})`;
    }
  }

  function handleLeave() {
    for (const el of itemRefs.current) {
      if (el) el.style.transform = "scale(1)";
    }
  }

  const items: DockItem[] = [
    { label: "Home", icon: HomeIcon, href: "#top" },
    { label: "Projects", icon: FolderIcon, href: "#projects" },
    ...socials.map((s) => ({
      label: s.label,
      icon: socialIcons[s.label],
      href: s.href,
      external: true,
    })),
    {
      label: isDark ? "Light mode" : "Dark mode",
      icon: isDark ? SunIcon : MoonIcon,
      onClick: toggleTheme,
    },
  ];

  // Index after which to draw a divider (between nav and socials, and before toggle).
  const dividerAfter = new Set([1, items.length - 2]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
      <nav
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        aria-label="Dock"
        className="pointer-events-auto flex items-end gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:shadow-black/40"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          const content = (
            <Icon className="h-[22px] w-[22px] text-foreground/70 transition-colors group-hover:text-accent" />
          );
          const className =
            "group flex h-11 w-11 origin-bottom items-center justify-center rounded-xl transition-[transform,background-color] duration-150 ease-out will-change-transform hover:bg-black/[0.04] dark:hover:bg-white/10";

          return (
            <div key={item.label} className="flex items-end gap-2">
              {item.href ? (
                <a
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  href={item.href}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  aria-label={item.label}
                  title={item.label}
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.label}
                  title={item.label}
                  className={className}
                >
                  {content}
                </button>
              )}
              {dividerAfter.has(i) && (
                <span className="mx-0.5 h-7 w-px self-center bg-black/10 dark:bg-white/10" />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
