import { describe, expect, it } from "vitest";
import nextConfig, { SHARE_CATCH_ALL } from "../../../../next.config";

// `beforeFiles` rewrites chain: each rule is re-tested against the path the
// previous one produced. The catch-all therefore has to leave /share/* alone,
// or the specific rules above it get their output rewritten a second time.
const catchAll = new RegExp(`^${SHARE_CATCH_ALL}$`);

describe("share host rewrites", () => {
  it("sends bare paths onto the /share mount", () => {
    expect(catchAll.test("8z43LqvaXMNSG6daneeFrh")).toBe(true);
    expect(catchAll.test("8z43LqvaXMNSG6daneeFrh/files/SPEC.md")).toBe(true);
    expect(catchAll.test("login")).toBe(true);
  });

  it("does not re-rewrite a path an earlier rule already moved", () => {
    // "/" -> "/share", "/robots.txt" -> "/share/robots.txt",
    // "/:id.md" -> "/share/:id/md". None of these may match again.
    expect(catchAll.test("share")).toBe(false);
    expect(catchAll.test("share/robots.txt")).toBe(false);
    expect(catchAll.test("share/8z43LqvaXMNSG6daneeFrh/md")).toBe(false);
    expect(catchAll.test("share/8z43LqvaXMNSG6daneeFrh/pdf")).toBe(false);
  });

  it("leaves Next's own asset paths where they are", () => {
    expect(catchAll.test("_next/static/chunks/main.js")).toBe(false);
    expect(catchAll.test("favicon.ico")).toBe(false);
  });

  it("keeps the landing page, robots, and both suffix routes ahead of it", async () => {
    const { beforeFiles } = (await nextConfig.rewrites!()) as {
      beforeFiles: { source: string; destination: string }[];
    };
    const sources = beforeFiles.map((r) => r.source);
    const catchAllIndex = sources.findIndex((s) => s.includes(SHARE_CATCH_ALL));
    expect(catchAllIndex).toBeGreaterThan(-1);
    for (const specific of ["/", "/robots.txt"]) {
      expect(sources.indexOf(specific)).toBeGreaterThan(-1);
      expect(sources.indexOf(specific)).toBeLessThan(catchAllIndex);
    }
    expect(sources.filter((s) => s.endsWith(".md")).length).toBeGreaterThan(0);
    expect(sources.filter((s) => s.endsWith(".pdf")).length).toBeGreaterThan(0);
  });

  it("sends X-Robots-Tag on the share host, where paths are bare", async () => {
    const headers = (await nextConfig.headers!()) as {
      source: string;
      has?: { type: string; value?: string }[];
      headers: { key: string; value: string }[];
    }[];
    const hostRule = headers.find(
      (h) => h.source === "/:path*" && h.has?.some((c) => c.type === "host"),
    );
    expect(hostRule?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow",
    });
  });
});
