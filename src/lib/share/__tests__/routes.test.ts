import { beforeAll, describe, expect, it, vi } from "vitest";

// The update route revalidates the reader path; outside a request scope that
// is meaningless, and calling the route handler directly is outside one.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

process.env.SHARE_STORE = "memory";
process.env.SHARE_OWNER_TOKEN = "0123456789abcdef0123456789abcdef";

const SOURCE = "# Route test\r\n\r\nExact   whitespace\t kept.\n\n## S\n\n- a\n";

describe("share routes", () => {
  let id: string;
  let GET: typeof import("@/app/share/[id]/md/route").GET;
  let POST: typeof import("@/app/share/api/share/route").POST;

  beforeAll(async () => {
    ({ GET } = await import("@/app/share/[id]/md/route"));
    ({ POST } = await import("@/app/share/api/share/route"));
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`, "content-type": "text/markdown" },
        body: SOURCE,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    id = body.id;
    expect(body.url).toBe(`https://share.carter.md/${id}`);
    expect(body.markdownUrl).toBe(`https://share.carter.md/${id}.md`);
    expect(body.pdfUrl).toBe(`https://share.carter.md/${id}.pdf`);
  });

  it("rejects unauthenticated and empty publishes", async () => {
    const unauth = await POST(new Request("http://x/api/share", { method: "POST", body: "# x" }));
    expect(unauth.status).toBe(401);
    const empty = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}` },
        body: "  ",
      }),
    );
    expect(empty.status).toBe(400);
  });

  it(".md returns the exact source with the right headers", async () => {
    const res = await GET(new Request("http://x/"), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(await res.text()).toBe(SOURCE);
  });

  it(".md?download sets an attachment filename from the title", async () => {
    const res = await GET(new Request("http://x/?download=1"), { params: Promise.resolve({ id }) });
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="route-test.md"');
  });

  it(".md 404s for unknown and revoked ids", async () => {
    const unknown = await GET(new Request("http://x/"), { params: Promise.resolve({ id: "1".repeat(22) }) });
    expect(unknown.status).toBe(404);
    const { getStore, setRevoked } = await import("@/lib/share");
    await setRevoked(getStore(), id, true);
    const revoked = await GET(new Request("http://x/"), { params: Promise.resolve({ id }) });
    expect(revoked.status).toBe(404);
  });
});

describe("attachment routes", () => {
  it("serves and 404s attachments", async () => {
    const { GET } = await import("@/app/share/[id]/files/[name]/route");
    const { POST } = await import("@/app/share/api/share/route");
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ markdown: "# Doc", attachments: [{ name: "spec.md", markdown: "# Spec\n" }] }),
      }),
    );
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const ok = await GET(new Request("http://x/?download=1"), { params: Promise.resolve({ id, name: "spec.md" }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(ok.headers.get("content-disposition")).toBe('attachment; filename="spec.md"');
    expect(await ok.text()).toBe("# Spec\n");
    const missing = await GET(new Request("http://x/"), { params: Promise.resolve({ id, name: "nope.md" }) });
    expect(missing.status).toBe(404);
  });
});

describe("update route", () => {
  let id: string;
  let PUT: typeof import("@/app/share/api/share/[id]/route").PUT;
  let readMarkdown: typeof import("@/app/share/[id]/md/route").GET;

  const put = (body: unknown, target: string, auth = true) =>
    PUT(
      new Request(`http://x/api/share/${target}`, {
        method: "PUT",
        headers: {
          ...(auth ? { authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}` } : {}),
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: target }) },
    );

  beforeAll(async () => {
    ({ PUT } = await import("@/app/share/api/share/[id]/route"));
    ({ GET: readMarkdown } = await import("@/app/share/[id]/md/route"));
    const { POST } = await import("@/app/share/api/share/route");
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          markdown: "# First title\n\nBody.\n",
          attachments: [{ name: "old.md", markdown: "# Old\n" }],
        }),
      }),
    );
    expect(res.status).toBe(201);
    ({ id } = await res.json());
  });

  it("rejects an unauthenticated update", async () => {
    const res = await put({ markdown: "# Nope\n" }, id, false);
    expect(res.status).toBe(401);
  });

  it("404s for unknown and malformed ids", async () => {
    expect((await put({ markdown: "# x\n" }, "1".repeat(22))).status).toBe(404);
    expect((await put({ markdown: "# x\n" }, "not-an-id")).status).toBe(404);
  });

  it("rejects an empty document", async () => {
    expect((await put({ markdown: "   " }, id)).status).toBe(400);
  });

  it("replaces the markdown, title, and attachments, keeping the id and URLs", async () => {
    const { getStore } = await import("@/lib/share");
    const before = await getStore().get(id);
    const res = await put(
      {
        markdown: "# Second title\n\nReplaced.\n",
        filename: "second.md",
        attachments: [{ name: "new.md", markdown: "# New\n" }],
      },
      id,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(body.url).toBe(`https://share.carter.md/${id}`);
    expect(body.markdownUrl).toBe(`https://share.carter.md/${id}.md`);
    expect(body.pdfUrl).toBe(`https://share.carter.md/${id}.pdf`);

    const after = await getStore().get(id);
    expect(after!.title).toBe("Second title");
    expect(after!.createdAt).toBe(before!.createdAt);
    expect(Date.parse(after!.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before!.updatedAt));
    expect(after!.attachments.map((a) => a.name)).toEqual(["new.md"]);

    const served = await readMarkdown(new Request("http://x/"), {
      params: Promise.resolve({ id }),
    });
    expect(await served.text()).toBe("# Second title\n\nReplaced.\n");
  });
});

describe("draft routes", () => {
  let id: string;
  let PUT: typeof import("@/app/share/api/share/[id]/route").PUT;

  const put = (body: unknown) =>
    PUT(
      new Request(`http://x/api/share/${id}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  beforeAll(async () => {
    ({ PUT } = await import("@/app/share/api/share/[id]/route"));
    const { POST } = await import("@/app/share/api/share/route");
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          markdown: "# Doc\n\ndraft one\n",
          version: "1.0",
          attachments: [{ name: "spec.md", markdown: "# Spec one\n" }],
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.version).toBe("1.0");
    expect(body.versions).toEqual([]);
    id = body.id;
  });

  it("returns every draft's URLs after a bump", async () => {
    const res = await put({
      markdown: "# Doc\n\ndraft two\n",
      version: "1.1",
      attachments: [{ name: "spec.md", markdown: "# Spec two\n" }],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe("1.1");
    expect(body.versions).toEqual([
      {
        version: "1.0",
        slug: "draft1_0",
        url: `https://share.carter.md/${id}/draft1_0`,
        markdownUrl: `https://share.carter.md/${id}/draft1_0.md`,
        pdfUrl: `https://share.carter.md/${id}/draft1_0.pdf`,
      },
    ]);
  });

  it("serves the archived bytes at /:id/:version.md", async () => {
    const { GET } = await import("@/app/share/[id]/[version]/md/route");
    const res = await GET(new Request("http://x/"), {
      params: Promise.resolve({ id, version: "draft1_0" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await res.text()).toBe("# Doc\n\ndraft one\n");

    // An archived download says which draft it is, so it cannot be confused
    // with the current one in a downloads folder.
    const download = await GET(new Request("http://x/?download=1"), {
      params: Promise.resolve({ id, version: "draft1_0" }),
    });
    expect(download.headers.get("content-disposition")).toBe(
      'attachment; filename="doc-draft1_0.md"',
    );

    const { GET: file } = await import("@/app/share/[id]/[version]/files/[name]/route");
    const fileDownload = await file(new Request("http://x/?download=1"), {
      params: Promise.resolve({ id, version: "draft1_0", name: "spec.md" }),
    });
    expect(fileDownload.headers.get("content-disposition")).toBe(
      'attachment; filename="spec-draft1_0.md"',
    );
  });

  it("serves that draft's own copy of a context file", async () => {
    const { GET } = await import("@/app/share/[id]/[version]/files/[name]/route");
    const archived = await GET(new Request("http://x/"), {
      params: Promise.resolve({ id, version: "draft1_0", name: "spec.md" }),
    });
    expect(await archived.text()).toBe("# Spec one\n");

    const { GET: currentFile } = await import("@/app/share/[id]/files/[name]/route");
    const live = await currentFile(new Request("http://x/"), {
      params: Promise.resolve({ id, name: "spec.md" }),
    });
    expect(await live.text()).toBe("# Spec two\n");
  });

  it("404s an unknown, malformed, or reserved slug the same way", async () => {
    const { GET } = await import("@/app/share/[id]/[version]/md/route");
    const { GET: file } = await import("@/app/share/[id]/[version]/files/[name]/route");
    for (const version of ["draft9_9", "files", "md", "pdf", "not-a-draft"]) {
      const res = await GET(new Request("http://x/"), {
        params: Promise.resolve({ id, version }),
      });
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.text()).toBe("Document not found.\n");
    }
    const missingFile = await file(new Request("http://x/"), {
      params: Promise.resolve({ id, version: "draft1_0", name: "nope.md" }),
    });
    expect(missingFile.status).toBe(404);
  });

  it("hides every draft once the document is revoked", async () => {
    const { GET } = await import("@/app/share/[id]/[version]/md/route");
    const { getStore, setRevoked } = await import("@/lib/share");
    await setRevoked(getStore(), id, true);
    const res = await GET(new Request("http://x/"), {
      params: Promise.resolve({ id, version: "draft1_0" }),
    });
    expect(res.status).toBe(404);
    await setRevoked(getStore(), id, false);
    expect(
      (await GET(new Request("http://x/"), { params: Promise.resolve({ id, version: "draft1_0" }) }))
        .status,
    ).toBe(200);
  });

  it("rejects a bump the store cannot file, with the store's own status", async () => {
    const { POST } = await import("@/app/share/api/share/route");
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ markdown: "# Bare\n\nno marker\n" }),
      }),
    );
    const bare = (await res.json()).id;
    const PUT2 = PUT;
    const bumped = await PUT2(
      new Request(`http://x/api/share/${bare}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ markdown: "# Bare\n\nnext\n", version: "1.1" }),
      }),
      { params: Promise.resolve({ id: bare }) },
    );
    expect(bumped.status).toBe(400);
    expect((await bumped.json()).error).toMatch(/previousVersion/);
  });
});

/**
 * `?diff=1` is a link someone was sent, so it has to survive the route, and
 * it has to mean nothing on the page that has nothing to compare itself
 * with. These go through the page components rather than through
 * `sharePageProps` so the searchParams shape is covered too.
 */
describe("the diff query parameter", () => {
  let id: string;

  beforeAll(async () => {
    const { POST } = await import("@/app/share/api/share/route");
    const { PUT } = await import("@/app/share/api/share/[id]/route");
    const headers = {
      authorization: `Bearer ${process.env.SHARE_OWNER_TOKEN}`,
      "content-type": "application/json",
    };
    const res = await POST(
      new Request("http://x/api/share", {
        method: "POST",
        headers,
        body: JSON.stringify({
          markdown: "# Diff doc\n\nThe first paragraph of the first draft.\n",
          version: "1.0",
          attachments: [
            { name: "spec.md", markdown: "# Spec\n\nEvery event carries an id.\n" },
          ],
        }),
      }),
    );
    expect(res.status).toBe(201);
    id = (await res.json()).id;
    const bumped = await PUT(
      new Request(`http://x/api/share/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          markdown: "# Diff doc\n\nThe first paragraph of the second draft.\n",
          version: "1.1",
          previousVersion: "1.0",
          attachments: [
            { name: "spec.md", markdown: "# Spec\n\nEvery event carries an id and a tenant.\n" },
          ],
        }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(bumped.status).toBe(200);
  });

  /** The reader props behind whichever page component rendered. */
  const readerOf = (element: unknown) => {
    const props = (element as { props: Record<string, unknown> }).props;
    return (props.reader ?? props) as {
      initialDiff?: boolean;
      doc: { diff?: { stats: { changed: number } } };
    };
  };

  it("opens the archived draft on the diff", async () => {
    const { default: Page } = await import("@/app/share/[id]/[version]/page");
    const reader = readerOf(
      await Page({
        params: Promise.resolve({ id, version: "draft1_0" }),
        searchParams: Promise.resolve({ diff: "1" }),
      }),
    );
    expect(reader.initialDiff).toBe(true);
    expect(reader.doc.diff!.stats.changed).toBe(1);
  });

  it("computes the diff even when the page opens on the draft", async () => {
    const { default: Page } = await import("@/app/share/[id]/[version]/page");
    const reader = readerOf(
      await Page({
        params: Promise.resolve({ id, version: "draft1_0" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(reader.initialDiff).toBe(false);
    expect(reader.doc.diff).toBeDefined();
  });

  it("ignores it on the current draft, which has nothing to compare with", async () => {
    const { default: Page } = await import("@/app/share/[id]/page");
    const reader = readerOf(
      await Page({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve({ diff: "1" }),
      }),
    );
    expect(reader.initialDiff).toBe(false);
    expect(reader.doc.diff).toBeUndefined();
  });

  it("carries the same parameter on an archived context file", async () => {
    const { default: Page } = await import(
      "@/app/share/[id]/[version]/files/[name]/view/page"
    );
    const reader = readerOf(
      await Page({
        params: Promise.resolve({ id, version: "draft1_0", name: "spec.md" }),
        searchParams: Promise.resolve({ diff: "1" }),
      }),
    );
    expect(reader.initialDiff).toBe(true);
    expect(reader.doc.diff!.stats.changed).toBe(1);
  });

  it("ignores it on a context file of the current draft", async () => {
    const { default: Page } = await import("@/app/share/[id]/files/[name]/view/page");
    const reader = readerOf(
      await Page({
        params: Promise.resolve({ id, name: "spec.md" }),
        searchParams: Promise.resolve({ diff: "1" }),
      }),
    );
    expect(reader.initialDiff).toBe(false);
    expect(reader.doc.diff).toBeUndefined();
  });
});
