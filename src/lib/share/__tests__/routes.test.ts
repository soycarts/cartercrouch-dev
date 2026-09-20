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
