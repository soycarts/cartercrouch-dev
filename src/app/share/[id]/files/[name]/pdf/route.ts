import { getStore, getPublicDocument, findAttachment } from "@/lib/share";
import { pdfNotFound, pdfResponse } from "@/lib/share/pdf-response";

// GET /:id/files/:name/pdf — an attachment printed with the reader styling.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  const doc = await getPublicDocument(getStore(), id);
  const file = doc ? findAttachment(doc, name) : null;
  if (!doc || !file || !doc.settings.allowPdf) return pdfNotFound();
  return pdfResponse(
    request,
    `/share/${doc.id}?print=1&file=${encodeURIComponent(file.name)}`,
    file.name.replace(/\.md$/i, ".pdf"),
  );
}
