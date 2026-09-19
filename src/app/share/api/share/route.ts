import { verifyBearer } from "@/lib/share/auth";
import {
  ShareError,
  getStore,
  markdownUrl,
  pdfUrl,
  publishDocument,
  readerUrl,
} from "@/lib/share";

export const dynamic = "force-dynamic";

// POST /api/share — publish from a CLI or an agent.
//   Authorization: Bearer $SHARE_OWNER_TOKEN
//   Body: text/markdown (raw), or application/json {"markdown": "..."}
export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let markdown: unknown;
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      markdown = ((await request.json()) as { markdown?: unknown }).markdown;
    } else {
      markdown = await request.text();
    }
  } catch {
    return Response.json({ error: "Unreadable body" }, { status: 400 });
  }

  try {
    const doc = await publishDocument(getStore(), markdown);
    return Response.json(
      {
        id: doc.id,
        url: readerUrl(doc.id),
        markdownUrl: markdownUrl(doc.id),
        pdfUrl: pdfUrl(doc.id),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ShareError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
