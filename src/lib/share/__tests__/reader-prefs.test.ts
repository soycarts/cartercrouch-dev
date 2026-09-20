import { describe, expect, it } from "vitest";
import {
  canStepReaderSize,
  clampReaderSize,
  DEFAULT_READER_SIZE,
  DEFAULT_THEME,
  MAX_READER_SIZE,
  MIN_READER_SIZE,
  parseReaderSize,
  parseThemeChoice,
  READER_PREFS_SCRIPT,
  READER_SIZE_VAR,
  resolveTheme,
  SIZE_KEY,
  stepReaderSize,
  THEME_ATTR,
  THEME_KEY,
} from "../reader-prefs";

describe("theme choice", () => {
  it("accepts the three known values", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
  });

  it("falls back to system for anything unrecognised", () => {
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice(undefined)).toBe("system");
    expect(parseThemeChoice("")).toBe("system");
    expect(parseThemeChoice("Dark")).toBe("system");
    expect(parseThemeChoice("sepia")).toBe("system");
    expect(DEFAULT_THEME).toBe("system");
  });
});

describe("theme resolution", () => {
  it("honours an explicit choice whatever the system says", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the system preference for 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("resolves a stored value end to end", () => {
    const stored = (value: string | null, prefersDark: boolean) =>
      resolveTheme(parseThemeChoice(value), prefersDark);
    expect(stored(null, true)).toBe("dark");
    expect(stored(null, false)).toBe("light");
    expect(stored("light", true)).toBe("light");
    expect(stored("nonsense", true)).toBe("dark");
  });
});

describe("reader size", () => {
  it("clamps to the 13–20px band", () => {
    expect(clampReaderSize(12)).toBe(MIN_READER_SIZE);
    expect(clampReaderSize(-40)).toBe(MIN_READER_SIZE);
    expect(clampReaderSize(21)).toBe(MAX_READER_SIZE);
    expect(clampReaderSize(1000)).toBe(MAX_READER_SIZE);
    expect(clampReaderSize(17)).toBe(17);
  });

  it("rounds fractions and rejects non-numbers", () => {
    expect(clampReaderSize(16.4)).toBe(16);
    expect(clampReaderSize(16.6)).toBe(17);
    expect(clampReaderSize(Number.NaN)).toBe(DEFAULT_READER_SIZE);
    expect(clampReaderSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_READER_SIZE);
  });

  it("parses what storage hands back", () => {
    expect(parseReaderSize("18")).toBe(18);
    expect(parseReaderSize("18px")).toBe(18);
    expect(parseReaderSize("99")).toBe(MAX_READER_SIZE);
    expect(parseReaderSize("0")).toBe(MIN_READER_SIZE);
    expect(parseReaderSize(null)).toBe(DEFAULT_READER_SIZE);
    expect(parseReaderSize("")).toBe(DEFAULT_READER_SIZE);
    expect(parseReaderSize("  ")).toBe(DEFAULT_READER_SIZE);
    expect(parseReaderSize("large")).toBe(DEFAULT_READER_SIZE);
  });

  it("steps by one and saturates at the ends", () => {
    expect(stepReaderSize(15, 1)).toBe(16);
    expect(stepReaderSize(15, -1)).toBe(14);
    expect(stepReaderSize(MAX_READER_SIZE, 1)).toBe(MAX_READER_SIZE);
    expect(stepReaderSize(MIN_READER_SIZE, -1)).toBe(MIN_READER_SIZE);
    expect(stepReaderSize(999, -1)).toBe(MAX_READER_SIZE - 1);
  });

  it("reports when a step would do nothing", () => {
    expect(canStepReaderSize(DEFAULT_READER_SIZE, 1)).toBe(true);
    expect(canStepReaderSize(DEFAULT_READER_SIZE, -1)).toBe(true);
    expect(canStepReaderSize(MAX_READER_SIZE, 1)).toBe(false);
    expect(canStepReaderSize(MIN_READER_SIZE, -1)).toBe(false);
  });
});

describe("the pre-paint script", () => {
  it("is built from the same constants the component uses", () => {
    expect(READER_PREFS_SCRIPT).toContain(JSON.stringify(THEME_KEY));
    expect(READER_PREFS_SCRIPT).toContain(JSON.stringify(SIZE_KEY));
    expect(READER_PREFS_SCRIPT).toContain(JSON.stringify(THEME_ATTR));
    expect(READER_PREFS_SCRIPT).toContain(JSON.stringify(READER_SIZE_VAR));
    expect(READER_PREFS_SCRIPT).toContain(`n>=${MIN_READER_SIZE}&&n<=${MAX_READER_SIZE}`);
    expect(READER_PREFS_SCRIPT).toContain(`n=${DEFAULT_READER_SIZE}`);
  });

  it("cannot close the script element it is inlined into", () => {
    expect(READER_PREFS_SCRIPT.toLowerCase()).not.toContain("</script");
  });

  it("agrees with the helpers when run against a fake document", () => {
    // The script is the same decision tree as parseThemeChoice + resolveTheme;
    // exercise it directly so the two cannot drift apart unnoticed.
    const run = (theme: string | null, size: string | null, prefersDark: boolean) => {
      const element = {
        attributes: {} as Record<string, string>,
        style: {
          properties: {} as Record<string, string>,
          setProperty(name: string, value: string) {
            this.properties[name] = value;
          },
        },
        setAttribute(name: string, value: string) {
          this.attributes[name] = value;
        },
      };
      const scope = {
        document: { documentElement: element },
        localStorage: {
          getItem: (key: string) => (key === THEME_KEY ? theme : key === SIZE_KEY ? size : null),
        },
        window: { matchMedia: () => ({ matches: prefersDark }) },
      };
      new Function(
        "document",
        "localStorage",
        "window",
        READER_PREFS_SCRIPT,
      )(scope.document, scope.localStorage, scope.window);
      return {
        theme: element.attributes[THEME_ATTR],
        size: element.style.properties[READER_SIZE_VAR],
      };
    };

    expect(run(null, null, false)).toEqual({ theme: "light", size: "15px" });
    expect(run(null, null, true)).toEqual({ theme: "dark", size: "15px" });
    expect(run("system", "18", true)).toEqual({ theme: "dark", size: "18px" });
    expect(run("light", "20", true)).toEqual({ theme: "light", size: "20px" });
    expect(run("dark", "99", false)).toEqual({ theme: "dark", size: "15px" });
    expect(run("nonsense", "junk", false)).toEqual({ theme: "light", size: "15px" });
  });
});
