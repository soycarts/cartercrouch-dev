import { pdfNotFound, pdfResponse } from "./pdf-response";
import {
  documentFilename,
  findAttachment,
  versionedFilename,
  type SharedDocument,
} from "./store";

/**
 * The .md and .pdf surfaces, once. The current document and every archived
 * draft serve the same bytes with the same headers and the same 404 — the
 * only difference between them is which snapshot the caller looked up and,
 * for the PDF, which reader page Chromium is pointed at. Both route families
 * are thin wrappers over what is here.
 */

/** Unknown id, unknown draft, unknown filename, revoked: all the same reply. */
export function shareNotFound(): Response {
  return new Response("Document not found.\n", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

function markdownResponse(
  request: Request,
  body: string,
  updatedAt: string,
  filename: string,
): Response {
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=60",
    "X-Robots-Tag": "noindex, nofollow",
    "Last-Modified": new Date(updatedAt).toUTCString(),
  });
  if (new URL(request.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }
  return new Response(body, { headers });
}

/** GET /:id.md and /:id/:version.md — the canonical Markdown. */
export function documentMarkdownResponse(
  request: Request,
  doc: SharedDocument | null,
  version: string | null = null,
): Response {
  if (!doc) return shareNotFound();
  return markdownResponse(
    request,
    doc.markdown,
    doc.updatedAt,
    documentFilename(doc, "md", version),
  );
}

/** GET /:id/files/:name and its per-draft twin — an attachment's Markdown. */
export function attachmentMarkdownResponse(
  request: Request,
  doc: SharedDocument | null,
  name: string,
  version: string | null = null,
): Response {
  const file = doc ? findAttachment(doc, name) : null;
  if (!doc || !file) return shareNotFound();
  return markdownResponse(
    request,
    file.markdown,
    doc.updatedAt,
    versionedFilename(file.name, version),
  );
}

/**
 * The reader page the PDF routes print. A path on *this* deployment, not a
 * public URL: it is fetched by Chromium from inside the running server.
 */
export function printPath(id: string, version: string | null, file?: string): string {
  const base = version ? `/share/${id}/${version}` : `/share/${id}`;
  return file ? `${base}?print=1&file=${encodeURIComponent(file)}` : `${base}?print=1`;
}

export function documentPdfResponse(
  request: Request,
  doc: SharedDocument | null,
  version: string | null,
): Promise<Response> | Response {
  if (!doc || !doc.settings.allowPdf) return pdfNotFound();
  return pdfResponse(request, printPath(doc.id, version), documentFilename(doc, "pdf", version));
}

export function attachmentPdfResponse(
  request: Request,
  doc: SharedDocument | null,
  name: string,
  version: string | null,
): Promise<Response> | Response {
  const file = doc ? findAttachment(doc, name) : null;
  if (!doc || !file || !doc.settings.allowPdf) return pdfNotFound();
  return pdfResponse(
    request,
    printPath(doc.id, version, file.name),
    versionedFilename(file.name.replace(/\.md$/i, ".pdf"), version),
  );
}
