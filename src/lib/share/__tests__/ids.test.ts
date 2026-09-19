import { describe, expect, it } from "vitest";
import { generateShareId, isShareId, SHARE_ID_LENGTH } from "../ids";

describe("share ids", () => {
  it("are 22 chars from the base58 alphabet", () => {
    for (let i = 0; i < 1000; i++) {
      const id = generateShareId();
      expect(id).toHaveLength(SHARE_ID_LENGTH);
      expect(isShareId(id)).toBe(true);
      expect(id).not.toMatch(/[0OIl]/);
    }
  });

  it("carry at least 128 bits of entropy", () => {
    expect(Math.log2(58 ** SHARE_ID_LENGTH)).toBeGreaterThanOrEqual(128);
  });

  it("do not collide and use the whole alphabet", () => {
    const seen = new Set<string>();
    const chars = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generateShareId();
      seen.add(id);
      for (const c of id) chars.add(c);
    }
    expect(seen.size).toBe(10_000);
    expect(chars.size).toBe(58);
  });

  it("rejects malformed ids", () => {
    expect(isShareId("")).toBe(false);
    expect(isShareId("abc")).toBe(false);
    expect(isShareId("0".repeat(22))).toBe(false);
    expect(isShareId("../etc/passwd")).toBe(false);
    expect(isShareId(generateShareId() + ".md")).toBe(false);
  });
});
