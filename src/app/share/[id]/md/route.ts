import { getStore, getPublicDocument } from "@/lib/share";
import { documentMarkdownResponse } from "@/lib/share/responses";

// GET /:id.md — the canonical Markdown, byte-for-byte. `?download=1` turns it
// into an attachment with a filename derived from the title.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return documentMarkdownResponse(request, await getPublicDocument(getStore(), id));
}
