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
//   Body: text/markdown (raw), or application/json
//         {"markdown": "...", "filename": "design.md",
//          "attachments": [{"name": "spec.md", "markdown": "..."}]}
export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: { markdown: unknown; attachments?: unknown; filename?: unknown };
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as {
        markdown?: unknown;
        attachments?: unknown;
        filename?: unknown;
      };
      input = { markdown: body.markdown, attachments: body.attachments, filename: body.filename };
    } else {
      input = { markdown: await request.text() };
    }
  } catch {
    return Response.json({ error: "Unreadable body" }, { status: 400 });
  }

  try {
    const doc = await publishDocument(getStore(), input);
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
