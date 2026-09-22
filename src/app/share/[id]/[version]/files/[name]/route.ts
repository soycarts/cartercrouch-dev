import { getStore, getPublicVersion } from "@/lib/share";
import { attachmentMarkdownResponse } from "@/lib/share/responses";

// GET /:id/:version/files/:name — that draft's copy of a context file.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string; name: string }> },
) {
  const { id, version, name } = await params;
  return attachmentMarkdownResponse(
    request,
    await getPublicVersion(getStore(), id, version),
    name,
  );
}
