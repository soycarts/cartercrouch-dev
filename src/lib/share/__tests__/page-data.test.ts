import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

process.env.SHARE_STORE = "memory";

import { MemoryShareStore } from "../memory";
import { publishDocument, setRevoked, updateDocument } from "../store";
import {
  attachmentPageProps,
  documentMetadata,
  loadShareView,
  sharePageProps,
} from "../page-data";

/** Counts what a render actually pulls out of the store. */
class CountingStore extends MemoryShareStore {
  gets = 0;
  versionGets = 0;
  bytes = 0;

  async get(id: string) {
    this.gets += 1;
    const doc = await super.get(id);
    if (doc) this.bytes += Buffer.byteLength(JSON.stringify(doc), "utf8");
    return doc;
  }

  async getVersion(id: string, slug: string) {
    this.versionGets += 1;
    const doc = await super.getVersion(id, slug);
    if (doc) this.bytes += Buffer.byteLength(JSON.stringify(doc), "utf8");
    return doc;
  }

  reset() {
    this.gets = 0;
    this.versionGets = 0;
    this.bytes = 0;
  }
}

const SPEC = { name: "spec.md", markdown: "# Spec\n" };

async function withDrafts(store: CountingStore, count: number) {
  let doc = await publishDocument(store, {
    markdown: "# Doc\n\nbody\n",
    version: "1.0",
    attachments: [SPEC],
  });
  for (let i = 1; i <= count; i += 1) {
    doc = await updateDocument(store, doc.id, {
      markdown: "# Doc\n\nbody\n",
      version: `1.${i}`,
      attachments: [SPEC],
    });
  }
  return doc;
}

describe("the draft menu", () => {
  let store: CountingStore;
  beforeEach(() => {
    store = new CountingStore();
  });

  it("decides every link without reading a single snapshot", async () => {
    // Deciding "did draft 1.3 have spec.md?" by fetching draft 1.3 meant a
    // full read of every archived draft on every attachment page view.
    const doc = await withDrafts(store, 12);
    store.reset();
    const view = await loadShareView(doc.id, undefined, store);
    const props = await attachmentPageProps(view!, "spec.md", {});
    expect(store.versionGets).toBe(0);
    expect(store.gets).toBe(1);
    expect(props!.versions).toHaveLength(13);
    expect(props!.versions!.every((v) => v.href.endsWith("/files/spec.md/view"))).toBe(true);
  });

  it("reads one blob per draft when showing an archived page", async () => {
    const doc = await withDrafts(store, 12);
    store.reset();
    const view = await loadShareView(doc.id, "draft1_0", store);
    await attachmentPageProps(view!, "spec.md", {});
    expect(store.gets).toBe(1);
    expect(store.versionGets).toBe(1);
  });

  it("sends a draft that never had the file to that draft's document", async () => {
    const first = await publishDocument(store, {
      markdown: "# Doc\n",
      version: "1.0",
      attachments: [],
    });
    const second = await updateDocument(store, first.id, {
      markdown: "# Doc\n",
      version: "1.1",
      attachments: [SPEC],
    });
    const view = await loadShareView(second.id, undefined, store);
    const props = await attachmentPageProps(view!, "spec.md", {});
    const archived = props!.versions!.find((v) => v.label === "1.0")!;
    expect(archived.href).toMatch(/\/draft1_0$/);
    expect(archived.href).not.toContain("files");
  });

  it("sends a legacy entry with no recorded file names to the document", async () => {
    const doc = await withDrafts(store, 1);
    const stripped = (await store.get(doc.id))!;
    stripped.versions = stripped.versions.map((v) => {
      const legacy = { ...v };
      delete legacy.attachments;
      return legacy;
    });
    await store.put(stripped);
    const view = await loadShareView(doc.id, undefined, store);
    const props = await attachmentPageProps(view!, "spec.md", {});
    expect(props!.versions!.find((v) => v.label === "1.0")!.href).toMatch(/\/draft1_0$/);
  });

  it("stays hidden until there is a second draft to choose", async () => {
    const solo = await publishDocument(store, { markdown: "# Solo\n", version: "1.0" });
    const before = await sharePageProps((await loadShareView(solo.id, undefined, store))!, {});
    expect(before!.kind === "reader" && before!.reader.versions).toEqual([]);

    await updateDocument(store, solo.id, { markdown: "# Solo 2\n", version: "1.1" });
    const after = await sharePageProps((await loadShareView(solo.id, undefined, store))!, {});
    expect(after!.kind === "reader" && after!.reader.versions).toHaveLength(2);
  });
});

describe("an archived page that travels on its own", () => {
  it("marks the print view with its draft and when it was superseded", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, {
      markdown: "# Doc\n\none\n",
      version: "1.0",
      attachments: [SPEC],
    });
    const bumped = await updateDocument(store, doc.id, {
      markdown: "# Doc\n\ntwo\n",
      version: "1.1",
      attachments: [SPEC],
    });

    const archived = await loadShareView(doc.id, "draft1_0", store);
    const print = await sharePageProps(archived!, { print: "1" });
    expect(print!.kind).toBe("print");
    expect(print!.kind === "print" && print!.versionLabel).toBe("1.0");
    expect(print!.kind === "print" && print!.superseded).toEqual({
      at: bumped.versions[0].supersededAt,
      currentHref: `https://share.carter.md/${doc.id}`,
    });

    // An attachment printed out of an archived draft says the same.
    const filePrint = await sharePageProps(archived!, { print: "1", file: "spec.md" });
    expect(filePrint!.kind === "print" && filePrint!.versionLabel).toBe("1.0");

    // The current draft carries no superseded line.
    const live = await loadShareView(doc.id, undefined, store);
    const livePrint = await sharePageProps(live!, { print: "1" });
    expect(livePrint!.kind === "print" && livePrint!.superseded).toBeNull();
    expect(livePrint!.kind === "print" && livePrint!.versionLabel).toBe("1.1");
  });
});

describe("a snapshot the current document does not list", () => {
  it("is invisible to every page and to its metadata", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Secret one\n", version: "1.0" });
    const realPut = store.put.bind(store);
    let calls = 0;
    store.put = async (d) => {
      if (++calls === 1) throw new Error("redis blip");
      return realPut(d);
    };
    await expect(
      updateDocument(store, doc.id, { markdown: "# two\n", version: "1.1" }),
    ).rejects.toThrow("redis blip");
    store.put = realPut;

    expect(await loadShareView(doc.id, "draft1_0", store)).toBeNull();
    expect(await documentMetadata(null)).toMatchObject({ title: "Document not found" });
  });

  it("is still invisible after the document is revoked and restored", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# one\n", version: "1.0" });
    await updateDocument(store, doc.id, { markdown: "# two\n", version: "1.1" });
    await setRevoked(store, doc.id, true);
    expect(await loadShareView(doc.id, "draft1_0", store)).toBeNull();
    expect(await loadShareView(doc.id, undefined, store)).toBeNull();
    await setRevoked(store, doc.id, false);
    expect(await loadShareView(doc.id, "draft1_0", store)).not.toBeNull();
  });
});

describe("the diff an archived page carries", () => {
  it("is computed from the two blobs the page already reads", async () => {
    const store = new CountingStore();
    const doc = await publishDocument(store, {
      markdown: "# Doc\n\nOne.\n",
      version: "1.0",
      attachments: [SPEC],
    });
    await updateDocument(store, doc.id, {
      markdown: "# Doc\n\nTwo.\n",
      version: "1.1",
      attachments: [SPEC],
    });

    store.reset();
    const archived = await loadShareView(doc.id, "draft1_0", store);
    const props = await sharePageProps(archived!, {});
    // One current document, one snapshot — the same two reads the draft menu
    // needs. The diff adds no fetch of its own.
    expect(store.gets).toBe(1);
    expect(store.versionGets).toBe(1);

    const diff = props!.kind === "reader" ? props!.reader.doc.diff : undefined;
    expect(diff!.liveLabel).toBe("1.1");
    expect(diff!.stats).toEqual({ added: 0, removed: 0, changed: 1 });
    expect(diff!.note).toBeNull();
    expect(diff!.rendered.some((b) => b.kind === "del" && b.html.includes("One"))).toBe(true);
    expect(diff!.rendered.some((b) => b.kind === "add" && b.html.includes("Two"))).toBe(true);
  });

  it("is absent on the current draft", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Doc\n", version: "1.0" });
    await updateDocument(store, doc.id, { markdown: "# Doc 2\n", version: "1.1" });
    const live = await sharePageProps((await loadShareView(doc.id, undefined, store))!, {});
    expect(live!.kind === "reader" && live!.reader.doc.diff).toBeUndefined();
  });

  it("says so for a context file the current draft dropped", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, {
      markdown: "# Doc\n",
      version: "1.0",
      attachments: [{ name: "dropped.md", markdown: "# Dropped\n\nBody.\n" }],
    });
    await updateDocument(store, doc.id, { markdown: "# Doc\n", version: "1.1", attachments: [] });

    const archived = await loadShareView(doc.id, "draft1_0", store);
    const props = await attachmentPageProps(archived!, "dropped.md", {});
    expect(props!.doc.diff!.note).toBe("This file is not in the current draft.");
    expect(props!.doc.diff!.rendered.every((b) => b.kind === "del")).toBe(true);
  });

  it("is empty when a draft was bumped without an edit", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Doc\n\nSame.\n", version: "1.0" });
    await updateDocument(store, doc.id, { markdown: "# Doc\n\nSame.\n", version: "1.1" });
    const archived = await loadShareView(doc.id, "draft1_0", store);
    const props = await sharePageProps(archived!, {});
    const diff = props!.kind === "reader" ? props!.reader.doc.diff! : null;
    expect(diff!.source).toEqual([]);
    expect(diff!.stats).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("is not computed for the print view, which is draft-only", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, { markdown: "# Doc\n\nOne.\n", version: "1.0" });
    await updateDocument(store, doc.id, { markdown: "# Doc\n\nTwo.\n", version: "1.1" });
    const archived = await loadShareView(doc.id, "draft1_0", store);
    const print = await sharePageProps(archived!, { print: "1", diff: "1" });
    expect(print!.kind).toBe("print");
  });
});
