import { beforeAll, describe, expect, it, vi } from "vitest";
import { SHARE_CATCH_ALL } from "../../../../next.config";
import {
  attachmentPageUrl,
  attachmentPdfUrl,
  attachmentUrl,
  decodeRouteSegment,
} from "../urls";
import { findAttachment, type SharedDocument } from "../store";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

process.env.SHARE_STORE = "memory";
process.env.SHARE_OWNER_TOKEN = "0123456789abcdef0123456789abcdef";

const DOC = "# Design\n\n## Scope\n\nBody.\n";
const SPEC = "# The spec\n\n## Envelope\n\nBody.\n";

function fakeDoc(names: string[]): SharedDocument {
  return {
    id: "8z43LqvaXMNSG6daneeFrh",
    markdown: DOC,
    attachments: names.map((name) => ({ name, markdown: SPEC })),
    title: "Design",
    filename: null,
    version: null,
    versions: [],
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    revokedAt: null,
    settings: { access: "unlisted", allowPdf: true, allowMarkdownDownload: true },
  };
}

describe("resolving an attachment by name", () => {
  const doc = fakeDoc(["SPEC.md", "measurement catalogue.md"]);

  it("matches regardless of case, and answers with the canonical name", () => {
    expect(findAttachment(doc, "SPEC.md")?.name).toBe("SPEC.md");
    expect(findAttachment(doc, "spec.md")?.name).toBe("SPEC.md");
    expect(findAttachment(doc, "Spec.MD")?.name).toBe("SPEC.md");
  });

  it("matches names with spaces in them", () => {
    expect(findAttachment(doc, "measurement catalogue.md")?.name).toBe("measurement catalogue.md");
  });

  it("misses cleanly", () => {
    expect(findAttachment(doc, "nope.md")).toBeNull();
    expect(findAttachment(doc, "")).toBeNull();
    expect(findAttachment(fakeDoc([]), "SPEC.md")).toBeNull();
  });
});

describe("attachment URLs", () => {
  const id = "8z43LqvaXMNSG6daneeFrh";

  it("hang the page off /view, beside /pdf, with the Markdown on the bare name", () => {
    expect(attachmentUrl(id, "SPEC.md")).toBe(`https://share.carter.md/${id}/files/SPEC.md`);
    expect(attachmentPageUrl(id, "SPEC.md")).toBe(
      `https://share.carter.md/${id}/files/SPEC.md/view`,
    );
    expect(attachmentPdfUrl(id, "SPEC.md")).toBe(`https://share.carter.md/${id}/files/SPEC.md/pdf`);
  });

  it("encode a name with spaces once, and only once", () => {
    expect(attachmentPageUrl(id, "measurement catalogue.md")).toBe(
      `https://share.carter.md/${id}/files/measurement%20catalogue.md/view`,
    );
  });

  it("survive the share host's catch-all rewrite", () => {
    const catchAll = new RegExp(`^${SHARE_CATCH_ALL}$`);
    const id = "8z43LqvaXMNSG6daneeFrh";
    expect(catchAll.test(`${id}/files/SPEC.md/view`)).toBe(true);
    expect(catchAll.test(`${id}/files/measurement%20catalogue.md/view`)).toBe(true);
    // ...and the rewritten path is not eligible a second time.
    expect(catchAll.test(`share/${id}/files/SPEC.md/view`)).toBe(false);
  });
});

describe("decoding a page's dynamic segment", () => {
  it("undoes the encoding attachmentUrl applied", () => {
    expect(decodeRouteSegment("measurement%20catalogue.md")).toBe("measurement catalogue.md");
    expect(decodeRouteSegment("SPEC.md")).toBe("SPEC.md");
  });

  it("hands back a malformed segment rather than throwing", () => {
    expect(decodeRouteSegment("%")).toBe("%");
    expect(decodeRouteSegment("%zz.md")).toBe("%zz.md");
  });
});

describe("the attachment page's misses", () => {
  let AttachmentPage: typeof import("@/app/share/[id]/files/[name]/view/page").default;
  let id: string;

  beforeAll(async () => {
    const { POST } = await import("@/app/share/api/share/route");
    ({ default: AttachmentPage } = await import("@/app/share/[id]/files/[name]/view/page"));
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          markdown: DOC,
          attachments: [
            { name: "SPEC.md", markdown: SPEC },
            { name: "measurement catalogue.md", markdown: SPEC },
          ],
        }),
      }),
    );
    expect(res.status).toBe(201);
    id = (await res.json()).id;
  });

  const render = (docId: string, name: string) =>
    AttachmentPage({
      params: Promise.resolve({ id: docId, name }),
      searchParams: Promise.resolve({}),
    });

  // notFound() throws a tagged error rather than returning; assert on the tag
  // so a genuine crash cannot pass for a 404.
  const expectNotFound = async (docId: string, name: string) => {
    await expect(render(docId, name)).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  };

  it("renders a known file of a live document", async () => {
    await expect(render(id, "spec.md")).resolves.toBeTruthy();
  });

  // Page params arrive percent-encoded; route-handler params do not. The page
  // has to decode, or every filename with a space in it 404s.
  it("renders a file whose name arrives percent-encoded", async () => {
    await expect(render(id, "measurement%20catalogue.md")).resolves.toBeTruthy();
  });

  it("404s on an unknown document", async () => {
    await expectNotFound("aaaaaaaaaaaaaaaaaaaaaa", "SPEC.md");
  });

  it("404s on a malformed id", async () => {
    await expectNotFound("not-an-id", "SPEC.md");
  });

  it("404s on an unknown attachment of a live document", async () => {
    await expectNotFound(id, "nope.md");
  });

  it("404s once the document is revoked", async () => {
    const { getStore, setRevoked } = await import("@/lib/share");
    await setRevoked(getStore(), id, true);
    await expectNotFound(id, "SPEC.md");
    await setRevoked(getStore(), id, false);
    await expect(render(id, "SPEC.md")).resolves.toBeTruthy();
  });
});

describe("reading a draft label off the wire", () => {
  it("takes version and previousVersion from a JSON body only", async () => {
    const { readDocumentInput } = await import("../input");
    const json = await readDocumentInput(
      new Request("http://x/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: "# D", version: "1.1", previousVersion: "1.0" }),
      }),
    );
    expect(json).toMatchObject({ version: "1.1", previousVersion: "1.0" });

    const raw = await readDocumentInput(
      new Request("http://x/", {
        method: "POST",
        headers: { "content-type": "text/markdown" },
        body: "# D",
      }),
    );
    expect(raw.version).toBeUndefined();
    expect(raw.previousVersion).toBeUndefined();
  });
});
