import { getStore, getPublicVersion } from "@/lib/share";
import { documentMarkdownResponse } from "@/lib/share/responses";

// GET /:id/:version.md — an archived draft's Markdown, byte-for-byte as it
// was published. A slug that is not a slug, or one never archived, 404s the
// way an unknown document does.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params;
  return documentMarkdownResponse(request, await getPublicVersion(getStore(), id, version));
}
