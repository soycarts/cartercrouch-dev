import { beforeAll, describe, expect, it } from "vitest";

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
