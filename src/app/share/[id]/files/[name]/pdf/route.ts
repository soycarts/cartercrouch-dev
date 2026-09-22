import { getStore, getPublicDocument } from "@/lib/share";
import { attachmentPdfResponse } from "@/lib/share/responses";

// GET /:id/files/:name/pdf — an attachment printed with the reader styling.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  return attachmentPdfResponse(request, await getPublicDocument(getStore(), id), name, null);
}
