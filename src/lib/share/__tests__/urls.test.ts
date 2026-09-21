import { afterEach, describe, expect, it } from "vitest";
import {
  attachmentPageUrl,
  attachmentPdfUrl,
  attachmentUrl,
  downloadFilename,
  markdownUrl,
  pdfUrl,
  readerUrl,
} from "../urls";

describe("share urls", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHARE_ORIGIN;
    delete process.env.SHARE_HOST;
  });

  it("default to the share host", () => {
    expect(readerUrl("abc")).toBe("https://share.carter.md/abc");
    expect(markdownUrl("abc")).toBe("https://share.carter.md/abc.md");
    expect(pdfUrl("abc")).toBe("https://share.carter.md/abc.pdf");
  });

  it("honour an explicit origin for local dev", () => {
    process.env.NEXT_PUBLIC_SHARE_ORIGIN = "http://localhost:3000/share/";
    expect(readerUrl("abc")).toBe("http://localhost:3000/share/abc");
  });

  it("put an archived draft's slug between the id and everything else", () => {
    expect(readerUrl("abc", "draft1_0")).toBe("https://share.carter.md/abc/draft1_0");
    expect(markdownUrl("abc", "draft1_0")).toBe("https://share.carter.md/abc/draft1_0.md");
    expect(pdfUrl("abc", "draft1_0")).toBe("https://share.carter.md/abc/draft1_0.pdf");
    expect(attachmentUrl("abc", "spec v2.md", "draft1_0")).toBe(
      "https://share.carter.md/abc/draft1_0/files/spec%20v2.md",
    );
    expect(attachmentPageUrl("abc", "spec.md", "draft1_0")).toBe(
      "https://share.carter.md/abc/draft1_0/files/spec.md/view",
    );
    expect(attachmentPdfUrl("abc", "spec.md", "draft1_0")).toBe(
      "https://share.carter.md/abc/draft1_0/files/spec.md/pdf",
    );
  });

  it("build the current document's URLs unchanged without a slug", () => {
    for (const none of [undefined, null]) {
      expect(readerUrl("abc", none)).toBe("https://share.carter.md/abc");
      expect(markdownUrl("abc", none)).toBe("https://share.carter.md/abc.md");
      expect(attachmentUrl("abc", "spec.md", none)).toBe(
        "https://share.carter.md/abc/files/spec.md",
      );
    }
  });

  it("derives safe filenames", () => {
    expect(downloadFilename("Agent Village — Data Infra!", "id", "md")).toBe(
      "agent-village-data-infra.md",
    );
    expect(downloadFilename(null, "XyZ", "pdf")).toBe("XyZ.pdf");
    expect(downloadFilename("Café", "id", "md")).toBe("cafe.md");
  });
});

describe("redirect and self-origin safety", () => {
  it("only allows in-app next paths", async () => {
    const { safeNextPath, selfOrigin } = await import("../urls");
    expect(safeNextPath("/manage/abc")).toBe("/manage/abc");
    expect(safeNextPath("https://evil.example")).toBe("/new");
    expect(safeNextPath("//evil.example")).toBe("/new");
    expect(safeNextPath("/\\evil.example")).toBe("/new");
    expect(safeNextPath(undefined)).toBe("/new");
    process.env.VERCEL_URL = "example-abc.vercel.app";
    expect(selfOrigin()).toBe("https://example-abc.vercel.app");
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "cartercrouch.dev";
    expect(selfOrigin()).toBe("https://cartercrouch.dev");
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(selfOrigin()).toMatch(/^http:\/\/localhost:\d+$/);
  });
});
