import { getStore, getPublicDocument, downloadFilename, selfOrigin } from "@/lib/share";
import { renderPdf } from "@/lib/share/pdf";

// GET /:id.pdf — generated on demand from the reader's print view.
// Chromium needs a few seconds on a cold start; the CDN caches for a minute.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  if (!doc || !doc.settings.allowPdf) {
    return new Response("Document not found.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // Print the page on this same deployment (not the public origin, which may
  // not resolve yet), using an origin from the environment rather than the
  // request's Host header so a client can't point Chromium elsewhere.
  const pageUrl = `${selfOrigin()}/share/${doc.id}?print=1`;

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(pageUrl);
  } catch (err) {
    console.error("[share] PDF generation failed", err);
    return new Response(
      "PDF generation is temporarily unavailable. The document is still readable at its main URL, and the exact Markdown at the .md URL.\n",
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  const wantsDownload = new URL(request.url).searchParams.has("download");
  const filename = downloadFilename(doc.title, doc.id, "pdf");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=0, s-maxage=60",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
