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

  it("wraps every table in a scroll container", async () => {
    const html = await renderHtml("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain('<div class="table-scroll"><table>');
    expect(html).toContain("</table></div>");
  });

  it("turns a single newline into a line break, as Obsidian does", async () => {
    const html = await renderHtml("***Draft:*** 1.0\n***Author:*** Carter Crouch\n");
    expect(html).toContain("<br>");
    expect(html.match(/<p>/g)).toHaveLength(1);
  });

  it("leaves tables and code blocks alone when breaking lines", async () => {
    const html = await renderHtml(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\nconst y = 2;\n```\n",
    );
    expect(html).toContain("<table>");
    expect(html.slice(html.indexOf("<table>"), html.indexOf("</table>"))).not.toContain("<br>");
    expect(html.slice(html.indexOf("<pre>"))).not.toContain("<br>");
    expect(html).toContain("const x = 1;\nconst y = 2;");
  });

  it("infers the title from the first H1", async () => {
    expect(await inferTitle("# Hello *world*\n\ntext")).toBe("Hello world");
    expect(await inferTitle("no heading")).toBeNull();
    expect(await inferTitle("## Only H2")).toBeNull();
  });

  it("splits sections at H2, keeps their headings, and lifts the H1", async () => {
    const doc = await renderDocument(
      "# Title\n\nLede paragraph.\n\n## First\n\nA.\n\n## Second Heading\n\nB.\n",
    );
    expect(doc.title).toBe("Title");
    expect(doc.description).toBe("Lede paragraph.");
    expect(doc.sections).toHaveLength(3);
    expect(doc.sections.map((s) => s.heading)).toEqual([null, "First", "Second Heading"]);
    expect(doc.sections[2].id).toBe("user-content-second-heading");
    expect(doc.sections[0].html).toContain("Lede paragraph.");
    expect(doc.sections[0].html).not.toContain("<h1");
    expect(doc.sections[2].html).toContain('<h2 id="user-content-second-heading">');
    expect(doc.sections[2].html).toContain("<p>B.</p>");
  });

  it("builds a nested table of contents from H2–H4", async () => {
    const doc = await renderDocument(
      "# Title\n\n## One\n\n### One A\n\n#### Deep\n\n##### Too deep\n\n## Two\n",
    );
    expect(doc.toc).toEqual([
      { depth: 2, id: "user-content-one", text: "One" },
      { depth: 3, id: "user-content-one-a", text: "One A" },
      { depth: 4, id: "user-content-deep", text: "Deep" },
      { depth: 2, id: "user-content-two", text: "Two" },
    ]);
  });

  it("describes only the first line of a broken lede", async () => {
    const doc = await renderDocument("# T\n\n***Draft:*** 1.0\n***Author:*** Carter\n");
    expect(doc.description).toBe("Draft: 1.0");
  });

  it("clips long descriptions on a word boundary", async () => {
    const long = "word ".repeat(60).trim();
    const doc = await renderDocument(`# T\n\n${long}`);
    expect(doc.description!.length).toBeLessThanOrEqual(160);
    expect(doc.description!.endsWith("…")).toBe(true);
  });
});
