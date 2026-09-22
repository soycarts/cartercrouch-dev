import { revalidatePath } from "next/cache";
import { verifyBearer } from "@/lib/share/auth";
import {
  ShareError,
  getStore,
  isShareId,
  markdownUrl,
  pdfUrl,
  readerUrl,
  updateDocument,
  versionLinks,
} from "@/lib/share";
import { readDocumentInput } from "@/lib/share/input";

export const dynamic = "force-dynamic";

// PUT /api/share/:id — replace a document and its attachments in place.
//   Authorization: Bearer $SHARE_OWNER_TOKEN
//   Body: the same shapes POST /api/share takes — text/markdown (raw), or
//         application/json {"markdown": "...", "filename": "design.md",
//         "version": "1.1", "attachments": [{"name": "spec.md", ...}]}
// The id, its URLs, and createdAt are kept; the title is re-inferred and
// updatedAt is stamped by the store. PATCH is the same call: the body is a
// whole document either way. A `version` that differs from the stored one
// archives the outgoing draft first; the response lists every draft.
async function replaceDocument(request: Request, params: Promise<{ id: string }>) {
  if (!verifyBearer(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isShareId(id)) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  let input;
  try {
    input = await readDocumentInput(request);
  } catch {
    return Response.json({ error: "Unreadable body" }, { status: 400 });
  }

  try {
    const doc = await updateDocument(getStore(), id, input);
    // Same as the owner form's update action: the reader is force-dynamic,
    // but any cached render of this path should go.
    revalidatePath(`/share/${doc.id}`);
    return Response.json({
      id: doc.id,
      url: readerUrl(doc.id),
      markdownUrl: markdownUrl(doc.id),
      pdfUrl: pdfUrl(doc.id),
      version: doc.version,
      versions: versionLinks(doc),
    });
  } catch (err) {
    if (err instanceof ShareError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return replaceDocument(request, ctx.params);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return replaceDocument(request, ctx.params);
}
