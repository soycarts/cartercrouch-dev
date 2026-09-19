import type { ShareStore, SharedDocument, SharedDocumentSummary } from "./store";

// In-memory store for tests and for `SHARE_STORE=memory` local development.
// Nothing survives a process restart, by design.
export class MemoryShareStore implements ShareStore {
  private docs = new Map<string, SharedDocument>();

  async get(id: string) {
    const doc = this.docs.get(id);
    return doc ? structuredClone(doc) : null;
  }

  async put(doc: SharedDocument) {
    this.docs.set(doc.id, structuredClone(doc));
  }

  async list(): Promise<SharedDocumentSummary[]> {
    return [...this.docs.values()]
      .map(({ id, title, createdAt, updatedAt, revokedAt }) => ({
        id,
        title,
        createdAt,
        updatedAt,
        revokedAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
