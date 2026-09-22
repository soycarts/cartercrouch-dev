import { getStore, getPublicVersion } from "@/lib/share";
import { attachmentPdfResponse } from "@/lib/share/responses";

// GET /:id/:version/files/:name/pdf — that draft's copy of a context file.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string; name: string }> },
) {
  const { id, version, name } = await params;
  const doc = await getPublicVersion(getStore(), id, version);
  return attachmentPdfResponse(request, doc, name, doc ? version : null);
}
