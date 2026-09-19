import { describe, expect, it } from "vitest";
import { MemoryShareStore } from "../memory";
import {
  ShareError,
  getPublicDocument,
  publishDocument,
  setRevoked,
  updateDocument,
} from "../store";

const SOURCE = "# Proposal\r\n\r\nline one  \r\n\tindented\n\n```\ncode\n```\n";

describe("share store", () => {
  it("publishes and returns the exact source", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: SOURCE });
    expect(doc.title).toBe("Proposal");
    expect(doc.revokedAt).toBeNull();
    const read = await getPublicDocument(store, doc.id);
    expect(read?.markdown).toBe(SOURCE);
  });

  it("rejects empty or oversized bodies", async () => {
    const store = new MemoryShareStore();
    await expect(publishDocument(store, { markdown: "   " })).rejects.toBeInstanceOf(ShareError);
    await expect(publishDocument(store, { markdown: 42 })).rejects.toBeInstanceOf(ShareError);
    await expect(publishDocument(store, { markdown: "x".repeat(600 * 1024) })).rejects.toMatchObject({ status: 413 });
  });

  it("updates in place with a stable id", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# One" });
    const updated = await updateDocument(store, doc.id, { markdown: "# Two\n\nbody" });
    expect(updated.id).toBe(doc.id);
    expect(updated.title).toBe("Two");
    expect(updated.createdAt).toBe(doc.createdAt);
    expect(updated.updatedAt >= doc.updatedAt).toBe(true);
  });

  it("hides revoked, unknown, and malformed ids uniformly", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# One" });
    await setRevoked(store, doc.id, true);
    expect(await getPublicDocument(store, doc.id)).toBeNull();
    expect(await getPublicDocument(store, "nope")).toBeNull();
    expect(await getPublicDocument(store, "1".repeat(22))).toBeNull();
    await setRevoked(store, doc.id, false);
    expect(await getPublicDocument(store, doc.id)).not.toBeNull();
  });

  it("validates attachments", async () => {
    const store = new MemoryShareStore();
    const ok = await publishDocument(store, {
      markdown: "# Doc",
      attachments: [{ name: "spec.md", markdown: "# Spec" }, { name: "strategy v2.md", markdown: "s" }],
    });
    expect(ok.attachments.map((a) => a.name)).toEqual(["spec.md", "strategy v2.md"]);
    await expect(
      publishDocument(store, { markdown: "# Doc", attachments: [{ name: "evil.txt", markdown: "x" }] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      publishDocument(store, { markdown: "# Doc", attachments: [{ name: "../x.md", markdown: "x" }] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      publishDocument(store, {
        markdown: "# Doc",
        attachments: [{ name: "a.md", markdown: "x" }, { name: "A.md", markdown: "y" }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    const updated = await updateDocument(store, ok.id, { markdown: "# Doc", attachments: [] });
    expect(updated.attachments).toEqual([]);
  });

  it("accepts an owner-chosen filename separate from the title", async () => {
    const store = new MemoryShareStore();
    const { documentFilename } = await import("../store");
    const auto = await publishDocument(store, { markdown: "# Design Doc" });
    expect(auto.filename).toBeNull();
    expect(documentFilename(auto)).toBe("design-doc.md");
    const named = await publishDocument(store, {
      markdown: "# Design Doc",
      filename: "agentvillage_data_design_doc.md",
    });
    expect(named.title).toBe("Design Doc");
    expect(documentFilename(named)).toBe("agentvillage_data_design_doc.md");
    expect(documentFilename(named, "pdf")).toBe("agentvillage_data_design_doc.pdf");
    await expect(
      publishDocument(store, { markdown: "# D", filename: "notes.txt" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      publishDocument(store, {
        markdown: "# D",
        filename: "spec.md",
        attachments: [{ name: "spec.md", markdown: "x" }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lists newest first for the owner", async () => {
    const store = new MemoryShareStore();
    const a = await publishDocument(store, { markdown: "# A" });
    await new Promise((r) => setTimeout(r, 2));
    const b = await publishDocument(store, { markdown: "# B" });
    const list = await store.list();
    expect(list.map((d) => d.id)).toEqual([b.id, a.id]);
  });
});
