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

/**
 * Everything a document owns hangs off one base. An archived draft's slug
 * sits between the ID and the rest — `/:id/draft1_0.md`, `/:id/draft1_0/files/
 * :name` — so every builder below takes the same optional last argument and
 * a caller that has a slug in hand never has to build a path by hand.
 */
function documentBase(id: string, version?: string | null): string {
  return version ? `${shareOrigin()}/${id}/${version}` : `${shareOrigin()}/${id}`;
}

export function readerUrl(id: string, version?: string | null): string {
  return documentBase(id, version);
}

export function markdownUrl(id: string, version?: string | null): string {
  return `${documentBase(id, version)}.md`;
}

export function pdfUrl(id: string, version?: string | null): string {
  return `${documentBase(id, version)}.pdf`;
}

export function attachmentUrl(id: string, name: string, version?: string | null): string {
  return `${documentBase(id, version)}/files/${encodeURIComponent(name)}`;
}

export function attachmentPdfUrl(id: string, name: string, version?: string | null): string {
  return `${attachmentUrl(id, name, version)}/pdf`;
}

/**
 * Dynamic segments reach a route handler already decoded, but reach a *page*
 * exactly as they appeared in the URL — so "measurement%20catalogue.md" stays
 * encoded and matches no attachment. Decode once at the page boundary, and
 * fall back to the raw segment when it is not valid percent-encoding rather
 * than throwing a 500 at a reader who mistyped a URL.
 */
export function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The attachment's own reader page. The bare /files/:name URL already serves
 * the Markdown — attachment names end in .md, so that is the honest thing for
 * it to return — which is why the page hangs off /view, beside /pdf.
 */
export function attachmentPageUrl(id: string, name: string, version?: string | null): string {
  return `${attachmentUrl(id, name, version)}/view`;
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
