// Canonical public URLs for a shared document. The application is served
// under /share/* internally and mapped onto the share.carter.md hostname by
// the rewrites in next.config.ts, so every user-facing URL is built here from
// the public origin rather than from the request path.

export const DEFAULT_SHARE_HOST = "share.carter.md";

export function shareHost(): string {
  return process.env.SHARE_HOST || DEFAULT_SHARE_HOST;
}

export function shareOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SHARE_ORIGIN;
  if (explicit) return explicit.replace(/\/$/, "");
  return `https://${shareHost()}`;
}

/** Path prefix that internal (non-share-host) navigation must use. */
export function internalBase(): string {
  const origin = process.env.NEXT_PUBLIC_SHARE_ORIGIN;
  // When the public origin already points at the /share mount (local dev),
  // links inside the app are relative to it; otherwise they're bare.
  return origin && origin.endsWith("/share") ? "/share" : "";
}

export function readerUrl(id: string): string {
  return `${shareOrigin()}/${id}`;
}

export function markdownUrl(id: string): string {
  return `${shareOrigin()}/${id}.md`;
}

export function pdfUrl(id: string): string {
  return `${shareOrigin()}/${id}.pdf`;
}

/** A filesystem-safe filename derived from the title, e.g. "agent-village.md". */
export function downloadFilename(
  title: string | null,
  id: string,
  ext: "md" | "pdf",
): string {
  const base = (title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `${base || id}.${ext}`;
}

/**
 * Where this very deployment can be reached by a server-side fetch (used to
 * print the reader for PDFs). Never derived from request headers, which a
 * client controls: Vercel's own deployment URL in the cloud, localhost in dev.
 */
export function selfOrigin(): string {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? "3000"}`;
}

/**
 * Headers the PDF printer sends to itself. Preview deployments sit behind
 * Vercel Authentication; the automation bypass secret lets Chromium through.
 */
export function selfFetchHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

/** Only allow post-login redirects to a path inside this app. */
export function safeNextPath(next: string | null | undefined, fallback = "/new"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
