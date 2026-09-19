import { getStore, getPublicDocument, downloadFilename } from "@/lib/share";
import { pdfNotFound, pdfResponse } from "@/lib/share/pdf-response";

// GET /:id.pdf — generated on demand from the reader's print view.
// Chromium needs a few seconds on a cold start; the CDN caches for a minute.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  if (!doc || !doc.settings.allowPdf) return pdfNotFound();
  return pdfResponse(
    request,
    `/share/${doc.id}?print=1`,
    downloadFilename(doc.title, doc.id, "pdf"),
  );
}
