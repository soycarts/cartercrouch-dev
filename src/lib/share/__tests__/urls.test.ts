import { afterEach, describe, expect, it } from "vitest";
import { downloadFilename, markdownUrl, pdfUrl, readerUrl } from "../urls";

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

  it("derives safe filenames", () => {
    expect(downloadFilename("Agent Village — Data Infra!", "id", "md")).toBe(
      "agent-village-data-infra.md",
    );
    expect(downloadFilename(null, "XyZ", "pdf")).toBe("XyZ.pdf");
    expect(downloadFilename("Café", "id", "md")).toBe("cafe.md");
  });
});
