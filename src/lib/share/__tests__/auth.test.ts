import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sessionValue, verifyBearer, verifyOwnerToken, verifySession } from "../auth";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("owner auth", () => {
  beforeEach(() => {
    process.env.SHARE_OWNER_TOKEN = TOKEN;
  });
  afterEach(() => {
    delete process.env.SHARE_OWNER_TOKEN;
  });

  it("verifies the token in constant time and rejects everything else", () => {
    expect(verifyOwnerToken(TOKEN)).toBe(true);
    expect(verifyOwnerToken(TOKEN + "x")).toBe(false);
    expect(verifyOwnerToken("")).toBe(false);
    expect(verifyOwnerToken(null)).toBe(false);
  });

  it("refuses to operate with a short or missing token", () => {
    process.env.SHARE_OWNER_TOKEN = "short";
    expect(verifyOwnerToken("short")).toBe(false);
    expect(sessionValue()).toBeNull();
    delete process.env.SHARE_OWNER_TOKEN;
    expect(verifyOwnerToken(TOKEN)).toBe(false);
  });

  it("session value never equals the token and round-trips", () => {
    const session = sessionValue()!;
    expect(session).not.toBe(TOKEN);
    expect(verifySession(session)).toBe(true);
    expect(verifySession(TOKEN)).toBe(false);
  });

  it("checks bearer headers", () => {
    const ok = new Request("http://x", { headers: { authorization: `Bearer ${TOKEN}` } });
    const bad = new Request("http://x", { headers: { authorization: `Bearer nope` } });
    const none = new Request("http://x");
    expect(verifyBearer(ok)).toBe(true);
    expect(verifyBearer(bad)).toBe(false);
    expect(verifyBearer(none)).toBe(false);
  });
});
