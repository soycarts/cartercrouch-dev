import { getStore, getPublicDocument, documentFilename } from "@/lib/share";

// GET /:id.md — the canonical Markdown, byte-for-byte. `?download=1` turns it
// into an attachment with a filename derived from the title.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  if (!doc) {
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
  const wantsDownload = new URL(request.url).searchParams.has("download");
  if (wantsDownload) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${documentFilename(doc, "md")}"`,
    );
  }
  return new Response(doc.markdown, { headers });
}
