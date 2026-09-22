import type { DocumentInput } from "./store";

/**
 * The publish/update body, in either of the two shapes the API accepts:
 * raw text/markdown, or JSON with optional filename and attachments.
 * Throws when the body cannot be read at all; validation proper lives in
 * the store, so both routes report the same errors.
 */
export async function readDocumentInput(request: Request): Promise<DocumentInput> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    return { markdown: await request.text() };
  }
  const body = (await request.json()) as {
    markdown?: unknown;
    attachments?: unknown;
    filename?: unknown;
    version?: unknown;
    previousVersion?: unknown;
  };
  return {
    markdown: body.markdown,
    attachments: body.attachments,
    filename: body.filename,
    // A raw text/markdown body has nowhere to carry these, so a draft label
    // is a JSON-only affordance — the same asymmetry filename already has.
    version: body.version,
    previousVersion: body.previousVersion,
  };
}
