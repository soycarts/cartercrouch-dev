"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  canStepReaderSize,
  DARK_QUERY,
  DEFAULT_READER_SIZE,
  DEFAULT_THEME,
  MAX_READER_SIZE,
  MIN_READER_SIZE,
  parseReaderSize,
  parseThemeChoice,
  READER_SIZE_VAR,
  readStoredPref,
  resolveTheme,
  SIZE_KEY,
  stepReaderSize,
  THEME_ATTR,
  THEME_CHOICES,
  THEME_KEY,
  writeStoredPref,
  type ThemeChoice,
} from "@/lib/share/reader-prefs";

const THEME_LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

type Prefs = { theme: ThemeChoice; size: number };

/**
 * localStorage as an external store, read through useSyncExternalStore.
 *
 * The server has no preferences to render, so it always renders the defaults;
 * the client's first snapshot is whatever was stored. React handles that
 * difference for an external store without a hydration complaint, which
 * reading localStorage in a state initialiser would not survive.
 *
 * SERVER_PREFS is a fixed object on purpose: its identity is how the
 * component below tells "still rendering the server's answer" from "reading
 * the reader's own", and so knows when it may start writing to <html>.
 */
const SERVER_PREFS: Prefs = { theme: DEFAULT_THEME, size: DEFAULT_READER_SIZE };

let snapshot: Prefs | null = null;
const listeners = new Set<() => void>();

function getServerPrefs(): Prefs {
  return SERVER_PREFS;
}

function getPrefs(): Prefs {
  // Cached: useSyncExternalStore compares snapshots by identity and would
  // loop forever on a fresh object per call.
  snapshot ??= {
    theme: parseThemeChoice(readStoredPref(THEME_KEY)),
    size: parseReaderSize(readStoredPref(SIZE_KEY)),
  };
  return snapshot;
}

function subscribePrefs(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function setPrefs(change: Partial<Prefs>): void {
  snapshot = { ...getPrefs(), ...change };
  if (change.theme !== undefined) writeStoredPref(THEME_KEY, change.theme);
  if (change.size !== undefined) writeStoredPref(SIZE_KEY, String(change.size));
  for (const listener of listeners) listener();
}

/**
 * The reader's own two knobs, at the right end of the share bar: colour theme
 * (light / dark / system) and text size.
 *
 * Both are already on <html> by the time this renders — the blocking script
 * in the root layout's head put them there before the first paint — so this
 * component's job is only to *change* them. It stays out of the way until it
 * is reading real preferences, which is why every write is gated on
 * `hydrated`: nothing on the page moves during hydration, and only the
 * highlighted segment settles into place.
 */
export function ReaderControls() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs);
  const hydrated = prefs !== SERVER_PREFS;
  const { theme, size } = prefs;
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  // Resolve and apply the theme, and — while the choice is "system" — keep
  // following the OS as it flips (a scheduled switch at dusk, say).
  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia(DARK_QUERY);
    const apply = () =>
      document.documentElement.setAttribute(THEME_ATTR, resolveTheme(theme, media.matches));
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.setProperty(READER_SIZE_VAR, `${size}px`);
  }, [size, hydrated]);

  const chooseTheme = useCallback((next: ThemeChoice) => setPrefs({ theme: next }), []);
  const applySize = useCallback((next: number) => setPrefs({ size: next }), []);

  // A radiogroup takes a single tab stop, with the arrows moving between the
  // options — hence the roving tabindex and the refs.
  const onRadioKeyDown = (event: React.KeyboardEvent, index: number) => {
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    if (!back && !forward) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : -1) + THEME_CHOICES.length) % THEME_CHOICES.length;
    chooseTheme(THEME_CHOICES[next]);
    radios.current[next]?.focus();
  };

  const stepButton = (delta: number, label: string, hint: string) => {
    const allowed = canStepReaderSize(size, delta);
    return (
      <button
        type="button"
        className={`share-tab share-tab--tight ${allowed ? "" : "is-disabled"}`}
        aria-disabled={!allowed}
        aria-label={hint}
        title={hint}
        onClick={() => allowed && applySize(stepReaderSize(size, delta))}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="share-controls no-print">
      <div className="share-toggle" role="radiogroup" aria-label="Colour theme">
        {THEME_CHOICES.map((option, index) => (
          <button
            key={option}
            ref={(el) => {
              radios.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={theme === option}
            tabIndex={theme === option ? 0 : -1}
            title={`${THEME_LABEL[option]} theme`}
            className={`share-tab share-tab--tight ${theme === option ? "is-active" : ""}`}
            onClick={() => chooseTheme(option)}
            onKeyDown={(event) => onRadioKeyDown(event, index)}
          >
            {THEME_LABEL[option]}
          </button>
        ))}
      </div>

      <div className="share-toggle" role="group" aria-label="Text size">
        {stepButton(-1, "A−", `Smaller text (minimum ${MIN_READER_SIZE}px)`)}
        <button
          type="button"
          className="share-tab share-tab--tight share-size"
          title={`Reader text size ${size}px — reset to ${DEFAULT_READER_SIZE}px`}
          aria-label={`Reader text size ${size} pixels. Reset to ${DEFAULT_READER_SIZE} pixels`}
          onClick={() => applySize(DEFAULT_READER_SIZE)}
        >
          {size}
        </button>
        {stepButton(1, "A+", `Larger text (maximum ${MAX_READER_SIZE}px)`)}
      </div>
    </div>
  );
}
