import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SHARE_TIMEZONE, formatDate, onDifferentDays, shareTimeZone } from "../dates";

const original = process.env.SHARE_TIMEZONE;

afterEach(() => {
  if (original === undefined) delete process.env.SHARE_TIMEZONE;
  else process.env.SHARE_TIMEZONE = original;
});

describe("share dates", () => {
  it("defaults to the owner's timezone", () => {
    delete process.env.SHARE_TIMEZONE;
    expect(shareTimeZone()).toBe(DEFAULT_SHARE_TIMEZONE);
    expect(DEFAULT_SHARE_TIMEZONE).toBe("America/Los_Angeles");
  });

  it("shows the previous day for a UTC timestamp just after midnight", () => {
    delete process.env.SHARE_TIMEZONE;
    // 20 Sept 00:30 UTC is still the evening of the 19th in California.
    expect(formatDate("2026-09-20T00:30:00.000Z")).toMatch(/^19 SEPT? 2026$/);
    expect(formatDate("2026-09-20T18:00:00.000Z")).toMatch(/^20 SEPT? 2026$/);
  });

  it("honours SHARE_TIMEZONE", () => {
    process.env.SHARE_TIMEZONE = "UTC";
    expect(formatDate("2026-09-20T00:30:00.000Z")).toMatch(/^20 SEPT? 2026$/);
    process.env.SHARE_TIMEZONE = "Asia/Kolkata";
    expect(formatDate("2026-09-19T20:00:00.000Z")).toMatch(/^20 SEPT? 2026$/);
  });

  it("compares days in the owner's timezone, not in UTC", () => {
    delete process.env.SHARE_TIMEZONE;
    // Different UTC dates, same Pacific day: no "Updated" line.
    expect(onDifferentDays("2026-09-20T00:30:00.000Z", "2026-09-19T20:00:00.000Z")).toBe(false);
    expect(onDifferentDays("2026-09-21T00:30:00.000Z", "2026-09-19T20:00:00.000Z")).toBe(true);
  });
});
