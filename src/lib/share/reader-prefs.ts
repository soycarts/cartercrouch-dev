// Reader preferences for share.carter.md: colour theme and text size.
//
// Three callers share this module — the blocking <head> script that applies a
// stored preference before the first paint, the ReaderControls client
// component, and the unit tests. Everything here is pure: the DOM and
// localStorage are touched only inside the two clearly marked helpers at the
// bottom, so the rules themselves stay testable in vitest's node environment.

export const THEME_KEY = "share:theme";
export const SIZE_KEY = "share:size";

/** Attribute on <html> that the reader's dark tokens key off. */
export const THEME_ATTR = "data-share-theme";
/** Custom property the whole reader type scale hangs off. */
export const READER_SIZE_VAR = "--reader-size";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export type ThemeChoice = "light" | "dark" | "system";
/** What actually lands on <html>: "system" has been resolved by then. */
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME: ThemeChoice = "system";
export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

/** Anything unrecognised — absent, corrupt, from an older build — is "system". */
export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME;
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  return systemPrefersDark ? "dark" : "light";
}

export const MIN_READER_SIZE = 13;
export const MAX_READER_SIZE = 20;
export const DEFAULT_READER_SIZE = 15;

export function clampReaderSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_READER_SIZE;
  return Math.min(MAX_READER_SIZE, Math.max(MIN_READER_SIZE, Math.round(size)));
}

export function parseReaderSize(value: string | null | undefined): number {
  if (typeof value !== "string" || value.trim() === "") return DEFAULT_READER_SIZE;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? DEFAULT_READER_SIZE : clampReaderSize(parsed);
}

/** One press of A− or A+. Saturates at the ends rather than wrapping. */
export function stepReaderSize(size: number, delta: number): number {
  return clampReaderSize(clampReaderSize(size) + delta);
}

/** False at the limits, which is what greys the button out. */
export function canStepReaderSize(size: number, delta: number): boolean {
  return stepReaderSize(size, delta) !== clampReaderSize(size);
}

/**
 * The blocking script the share layout puts in <head>. It runs before the
 * first paint, so a reader who chose dark never sees a white flash, and the
 * type scale is already right when the prose appears.
 *
 * Built from the constants above rather than written out by hand, so the
 * storage keys and the limits cannot drift from the component's. Minified by
 * hand because it sits on the critical path of every page.
 */
export const READER_PREFS_SCRIPT =
  `(function(){try{var d=document.documentElement,t=null,s=null;` +
  `try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)});` +
  `s=localStorage.getItem(${JSON.stringify(SIZE_KEY)});}catch(e){}` +
  `if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light";}` +
  `d.setAttribute(${JSON.stringify(THEME_ATTR)},t);` +
  `var n=parseInt(s,10);` +
  `if(!(n>=${MIN_READER_SIZE}&&n<=${MAX_READER_SIZE}))n=${DEFAULT_READER_SIZE};` +
  `d.style.setProperty(${JSON.stringify(READER_SIZE_VAR)},n+"px");` +
  `}catch(e){}})();`;

// --- the two impure helpers -------------------------------------------------

/** Storage can throw outright (Safari private mode, blocked third-party). */
export function readStoredPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A failed write is not an error: the choice simply lasts the session. */
export function writeStoredPref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — in-memory state still drives the page */
  }
}
