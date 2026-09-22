import { verifyBearer } from "@/lib/share/auth";
import {
  ShareError,
  getStore,
  markdownUrl,
  pdfUrl,
  publishDocument,
  readerUrl,
  versionLinks,
} from "@/lib/share";
import { readDocumentInput } from "@/lib/share/input";

export const dynamic = "force-dynamic";

// POST /api/share — publish from a CLI or an agent.
//   Authorization: Bearer $SHARE_OWNER_TOKEN
//   Body: text/markdown (raw), or application/json
//         {"markdown": "...", "filename": "design.md", "version": "1.0",
//          "attachments": [{"name": "spec.md", "markdown": "..."}]}
// PUT /api/share/:id replaces an existing one; see [id]/route.ts.
export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input;
  try {
    input = await readDocumentInput(request);
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
        version: doc.version,
        versions: versionLinks(doc),
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
