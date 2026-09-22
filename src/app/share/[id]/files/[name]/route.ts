import { getStore, getPublicDocument } from "@/lib/share";
import { attachmentMarkdownResponse } from "@/lib/share/responses";

// GET /:id/files/:name — an attachment's exact Markdown.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  return attachmentMarkdownResponse(request, await getPublicDocument(getStore(), id), name);
}
