import { renderPdf } from "./pdf";
import { selfOrigin } from "./urls";

const NOT_FOUND = new Response("Document not found.\n", {
  status: 404,
  headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
});

export function pdfNotFound() {
  return NOT_FOUND.clone();
}

/**
 * Print `printPath` (a path on this deployment) and return it as a PDF
 * response, or a clean 502 that leaves the HTML and .md surfaces alone.
 */
export async function pdfResponse(request: Request, printPath: string, filename: string) {
  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(`${selfOrigin()}${printPath}`);
  } catch (err) {
    console.error("[share] PDF generation failed", err);
    return new Response(
      "PDF generation is temporarily unavailable. The document is still readable at its main URL, and the exact Markdown at the .md URL.\n",
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }
  const wantsDownload = new URL(request.url).searchParams.has("download");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=0, s-maxage=60",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
