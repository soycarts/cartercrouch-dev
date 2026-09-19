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
    const doc = await publishDocument(store, SOURCE);
    expect(doc.title).toBe("Proposal");
    expect(doc.revokedAt).toBeNull();
    const read = await getPublicDocument(store, doc.id);
    expect(read?.markdown).toBe(SOURCE);
  });

  it("rejects empty or oversized bodies", async () => {
    const store = new MemoryShareStore();
    await expect(publishDocument(store, "   ")).rejects.toBeInstanceOf(ShareError);
    await expect(publishDocument(store, 42)).rejects.toBeInstanceOf(ShareError);
    await expect(publishDocument(store, "x".repeat(600 * 1024))).rejects.toMatchObject({ status: 413 });
  });

  it("updates in place with a stable id", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, "# One");
    const updated = await updateDocument(store, doc.id, "# Two\n\nbody");
    expect(updated.id).toBe(doc.id);
    expect(updated.title).toBe("Two");
    expect(updated.createdAt).toBe(doc.createdAt);
    expect(updated.updatedAt >= doc.updatedAt).toBe(true);
  });

  it("hides revoked, unknown, and malformed ids uniformly", async () => {
    const store = new MemoryShareStore();
    const doc = await publishDocument(store, "# One");
    await setRevoked(store, doc.id, true);
    expect(await getPublicDocument(store, doc.id)).toBeNull();
    expect(await getPublicDocument(store, "nope")).toBeNull();
    expect(await getPublicDocument(store, "1".repeat(22))).toBeNull();
    await setRevoked(store, doc.id, false);
    expect(await getPublicDocument(store, doc.id)).not.toBeNull();
  });

  it("lists newest first for the owner", async () => {
    const store = new MemoryShareStore();
    const a = await publishDocument(store, "# A");
    await new Promise((r) => setTimeout(r, 2));
    const b = await publishDocument(store, "# B");
    const list = await store.list();
    expect(list.map((d) => d.id)).toEqual([b.id, a.id]);
  });
});
