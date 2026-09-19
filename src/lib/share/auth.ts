import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Single-owner auth. One secret, SHARE_OWNER_TOKEN, does double duty: the
// bearer token for POST /api/share, and the password for the /login form,
// which sets an httpOnly cookie holding an HMAC of the token. The token
// itself is never written to a cookie or shipped to the client.
export const SESSION_COOKIE = "share_owner";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function ownerToken(): string | null {
  const token = process.env.SHARE_OWNER_TOKEN;
  return token && token.length >= 16 ? token : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isOwnerConfigured(): boolean {
  return ownerToken() !== null;
}

/** Constant-time check of a presented secret against the owner token. */
export function verifyOwnerToken(presented: string | null | undefined): boolean {
  const token = ownerToken();
  if (!token || !presented) return false;
  return safeEqual(presented, token);
}

export function sessionValue(): string | null {
  const token = ownerToken();
  if (!token) return null;
  return createHmac("sha256", token).update("share-owner-session").digest("hex");
}

export function verifySession(presented: string | null | undefined): boolean {
  const expected = sessionValue();
  if (!expected || !presented) return false;
  return safeEqual(presented, expected);
}

/** Bearer auth for the JSON API. */
export function verifyBearer(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return verifyOwnerToken(match?.[1]?.trim());
}

export async function isOwnerSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function startOwnerSession(): Promise<void> {
  const value = sessionValue();
  if (!value) throw new Error("SHARE_OWNER_TOKEN is not configured.");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endOwnerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
