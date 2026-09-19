import { getStore, getPublicDocument, findAttachment } from "@/lib/share";

// GET /:id/files/:name — an attachment's exact Markdown.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  const doc = await getPublicDocument(getStore(), id);
  const file = doc ? findAttachment(doc, name) : null;
  if (!doc || !file) {
    return new Response("Document not found.\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=60",
    "X-Robots-Tag": "noindex, nofollow",
    "Last-Modified": new Date(doc.updatedAt).toUTCString(),
  });
  if (new URL(request.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="${file.name}"`);
  }
  return new Response(file.markdown, { headers });
}
