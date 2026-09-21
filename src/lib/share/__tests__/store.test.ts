import { describe, expect, it } from "vitest";
import { MemoryShareStore } from "../memory";
import {
  ShareError,
  getPublicDocument,
  getPublicVersion,
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

describe("version slugs", () => {
  it("turns a label into one routable segment", async () => {
    const { isVersionSlug, versionSlug } = await import("../store");
    expect(versionSlug("1.0")).toBe("draft1_0");
    expect(versionSlug("1.1")).toBe("draft1_1");
    expect(versionSlug("2")).toBe("draft2");
    expect(versionSlug("2.0 rc1")).toBe("draft2_0_rc1");
    expect(isVersionSlug("draft1_0")).toBe(true);
    expect(isVersionSlug("draft2_0_rc1")).toBe(true);
  });

  it("can never collide with the routes beside it", async () => {
    const { isVersionSlug } = await import("../store");
    for (const reserved of ["files", "md", "pdf", "view", "draft", "draft_1", "draft1_"]) {
      expect(isVersionSlug(reserved)).toBe(false);
    }
  });

  it("reads a label out of a hand-marked draft line", async () => {
    const { inferVersionLabel } = await import("../store");
    expect(inferVersionLabel("# Doc\n\n***Draft:*** 1.0\n\nBody")).toBe("1.0");
    expect(inferVersionLabel("# Doc\n\nDraft 2\n")).toBe("2");
    expect(inferVersionLabel("# Doc\n\nno marker here\n")).toBeNull();
    // Past the first 20 lines it is prose, not a marker.
    expect(inferVersionLabel("x\n".repeat(30) + "***Draft:*** 3.0\n")).toBeNull();
  });
});

describe("document versions", () => {
  const publishV1 = (store: MemoryShareStore) =>
    publishDocument(store, {
      markdown: "# Doc\n\nfirst\n",
      version: "1.0",
      attachments: [{ name: "spec.md", markdown: "# Spec one\n" }],
    });

  it("archives a byte-identical snapshot when the label changes", async () => {
    const store = new MemoryShareStore();
    const v1 = await publishV1(store);
    expect(v1.version).toBe("1.0");
    expect(v1.versions).toEqual([]);

    const v2 = await updateDocument(store, v1.id, {
      markdown: "# Doc\n\nsecond\n",
      version: "1.1",
      attachments: [{ name: "spec.md", markdown: "# Spec two\n" }],
    });
    expect(v2.version).toBe("1.1");
    expect(v2.versions).toEqual([
      {
        version: "1.0",
        slug: "draft1_0",
        publishedAt: v1.updatedAt,
        supersededAt: v2.updatedAt,
      },
    ]);

    const snapshot = await getPublicVersion(store, v1.id, "draft1_0");
    expect(snapshot!.markdown).toBe(v1.markdown);
    expect(snapshot!.attachments).toEqual([{ name: "spec.md", markdown: "# Spec one\n" }]);
    expect(snapshot!.title).toBe(v1.title);
    expect(snapshot!.createdAt).toBe(v1.createdAt);
    expect(snapshot!.updatedAt).toBe(v1.updatedAt);
    expect(snapshot!.version).toBe("1.0");
    expect(snapshot!.versions).toEqual([]);

    // The current document is untouched by later reads of an old one.
    expect((await getPublicDocument(store, v1.id))!.markdown).toBe("# Doc\n\nsecond\n");
  });

  it("updates in place when the label is unchanged or absent", async () => {
    const store = new MemoryShareStore();
    const v1 = await publishV1(store);
    const same = await updateDocument(store, v1.id, { markdown: "# Doc\n\nedit\n", version: "1.0" });
    expect(same.version).toBe("1.0");
    expect(same.versions).toEqual([]);
    expect(await getPublicVersion(store, v1.id, "draft1_0")).toBeNull();

    const silent = await updateDocument(store, v1.id, { markdown: "# Doc\n\nedit again\n" });
    expect(silent.version).toBe("1.0");
    expect(silent.versions).toEqual([]);
  });

  it("refuses to overwrite a slug that is already archived", async () => {
    const store = new MemoryShareStore();
    const v1 = await publishV1(store);
    await updateDocument(store, v1.id, { markdown: "# Doc\n\nb\n", version: "1.1" });
    // Back to 1.0, then forward again: archiving 1.0 a second time would
    // silently replace the snapshot readers already have the link to.
    await updateDocument(store, v1.id, { markdown: "# Doc\n\nc\n", version: "1.0" });
    await expect(
      updateDocument(store, v1.id, { markdown: "# Doc\n\nd\n", version: "1.2" }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getPublicVersion(store, v1.id, "draft1_0"))!.markdown).toBe("# Doc\n\nfirst\n");
  });

  it("infers the outgoing label from the document's own draft line", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Doc\n\n***Draft:*** 1.0\n\nbody\n" });
    expect(doc.version).toBeNull();
    const bumped = await updateDocument(store, doc.id, { markdown: "# Doc\n\n***Draft:*** 1.1\n", version: "1.1" });
    expect(bumped.versions.map((v) => v.slug)).toEqual(["draft1_0"]);
    expect((await getPublicVersion(store, doc.id, "draft1_0"))!.version).toBe("1.0");
  });

  it("takes previousVersion over the draft line, and needs one when neither exists", async () => {
    const store = new MemoryShareStore();
    const marked = await publishDocument(store, { markdown: "# Doc\n\n***Draft:*** 1.0\n" });
    const bumped = await updateDocument(store, marked.id, {
      markdown: "# Doc\n\nnext\n",
      version: "2.0",
      previousVersion: "0.9",
    });
    expect(bumped.versions.map((v) => v.slug)).toEqual(["draft0_9"]);

    const bare = await publishDocument(store, { markdown: "# Doc\n\nno marker\n" });
    await expect(
      updateDocument(store, bare.id, { markdown: "# Doc\n\nnext\n", version: "1.1" }),
    ).rejects.toMatchObject({ status: 400 });
    const rescued = await updateDocument(store, bare.id, {
      markdown: "# Doc\n\nnext\n",
      version: "1.1",
      previousVersion: "1.0",
    });
    expect(rescued.versions.map((v) => v.version)).toEqual(["1.0"]);
  });

  it("rejects a label that would not produce a reachable slug", async () => {
    const store = new MemoryShareStore();
    await expect(
      publishDocument(store, { markdown: "# Doc", version: ".1" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      publishDocument(store, { markdown: "# Doc", version: 7 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("hides every draft of a revoked document, and rejects a slug that is not one", async () => {
    const store = new MemoryShareStore();
    const v1 = await publishV1(store);
    await updateDocument(store, v1.id, { markdown: "# Doc\n\nb\n", version: "1.1" });
    expect(await getPublicVersion(store, v1.id, "draft1_0")).not.toBeNull();

    await setRevoked(store, v1.id, true);
    expect(await getPublicVersion(store, v1.id, "draft1_0")).toBeNull();
    await setRevoked(store, v1.id, false);

    expect(await getPublicVersion(store, v1.id, "files")).toBeNull();
    expect(await getPublicVersion(store, v1.id, "draft9_9")).toBeNull();
    expect(await getPublicVersion(store, "not-an-id", "draft1_0")).toBeNull();
  });

  it("reads missing version fields off an old blob as null and empty", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Old\n" });
    const legacy = { ...doc } as Partial<typeof doc>;
    delete legacy.version;
    delete legacy.versions;
    await store.put(legacy as typeof doc);
    const read = await getPublicDocument(store, doc.id);
    expect(read!.version).toBeNull();
    expect(read!.versions).toEqual([]);
  });
});
