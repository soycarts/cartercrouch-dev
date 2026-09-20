// Dates on share.carter.md are the owner's dates, not the server's. Vercel
// runs in UTC, so a document published on the evening of the 19th in
// California was rendering as the 20th. Every date the reader and the owner
// pages show goes through here.

export const DEFAULT_SHARE_TIMEZONE = "America/Los_Angeles";

export function shareTimeZone(): string {
  return process.env.SHARE_TIMEZONE || DEFAULT_SHARE_TIMEZONE;
}

/** "19 SEPT 2026", in the owner's timezone. */
export function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: shareTimeZone(),
    })
    .toUpperCase();
}

/** True when the two instants fall on different days for the owner. */
export function onDifferentDays(a: string, b: string): boolean {
  return formatDate(a) !== formatDate(b);
}
