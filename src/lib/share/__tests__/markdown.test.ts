import { describe, expect, it } from "vitest";
import { inferTitle, renderDocument, renderHtml } from "../markdown";

describe("markdown rendering", () => {
  it("drops raw HTML and scripts", async () => {
    const html = await renderHtml(
      '# T\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\nok <b onclick="x()">bold</b>\n',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).toContain("ok");
  });

  it("neutralises javascript: links", async () => {
    const html = await renderHtml("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("supports GFM tables, code, and task lists", async () => {
    const html = await renderHtml(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n- [x] done\n",
    );
    expect(html).toContain("<table>");
    expect(html).toContain('<code class="language-ts">');
    expect(html).toContain('type="checkbox"');
  });

  it("infers the title from the first H1", async () => {
    expect(await inferTitle("# Hello *world*\n\ntext")).toBe("Hello world");
    expect(await inferTitle("no heading")).toBeNull();
    expect(await inferTitle("## Only H2")).toBeNull();
  });

  it("splits sections at H2 and lifts the H1", async () => {
    const doc = await renderDocument(
      "# Title\n\nLede paragraph.\n\n## First\n\nA.\n\n## Second Heading\n\nB.\n",
    );
    expect(doc.title).toBe("Title");
    expect(doc.description).toBe("Lede paragraph.");
    expect(doc.sections.map((s) => s.number)).toEqual([null, 1, 2]);
    expect(doc.sections[1].heading).toBe("First");
    expect(doc.sections[2].id).toBe("user-content-second-heading");
    expect(doc.sections[0].html).toContain("Lede paragraph.");
    expect(doc.sections[0].html).not.toContain("<h1");
    expect(doc.sections[2].html).toContain("<p>B.</p>");
    expect(doc.sections[2].html).not.toContain("<h2");
  });

  it("clips long descriptions on a word boundary", async () => {
    const long = "word ".repeat(60).trim();
    const doc = await renderDocument(`# T\n\n${long}`);
    expect(doc.description!.length).toBeLessThanOrEqual(160);
    expect(doc.description!.endsWith("…")).toBe(true);
  });
});
