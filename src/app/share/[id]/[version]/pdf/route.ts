import { getStore, getPublicVersion } from "@/lib/share";
import { documentPdfResponse } from "@/lib/share/responses";

// GET /:id/:version.pdf — the archived draft's own print view, printed.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params;
  const doc = await getPublicVersion(getStore(), id, version);
  return documentPdfResponse(request, doc, doc ? version : null);
}
