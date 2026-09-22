import { getStore, getPublicDocument } from "@/lib/share";
import { documentPdfResponse } from "@/lib/share/responses";

// GET /:id.pdf — generated on demand from the reader's print view.
// Chromium needs a few seconds on a cold start; the CDN caches for a minute.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return documentPdfResponse(request, await getPublicDocument(getStore(), id), null);
}
