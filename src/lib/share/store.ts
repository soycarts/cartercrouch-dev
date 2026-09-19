import { generateShareId, isShareId } from "./ids";
import { inferTitle } from "./markdown";

export type SharedDocument = {
  id: string;
  /** The canonical Markdown, byte-for-byte as published. */
  markdown: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  settings: {
    access: "unlisted";
    allowPdf: boolean;
    allowMarkdownDownload: boolean;
  };
};

/** Summary row for the owner's list — never exposed publicly. */
export type SharedDocumentSummary = Pick<
  SharedDocument,
  "id" | "title" | "createdAt" | "updatedAt" | "revokedAt"
>;

/**
 * The persistence seam. Redis in production, memory in tests and as a
 * zero-config local fallback. Keep it tiny: this is a personal tool.
 */
export interface ShareStore {
  get(id: string): Promise<SharedDocument | null>;
  put(doc: SharedDocument): Promise<void>;
  list(): Promise<SharedDocumentSummary[]>;
}

export class ShareError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const MAX_BYTES = 512 * 1024;

function validateMarkdown(markdown: unknown): string {
  if (typeof markdown !== "string") {
    throw new ShareError("Markdown body is required.", 400);
  }
  if (markdown.trim().length === 0) {
    throw new ShareError("Markdown body is empty.", 400);
  }
  if (Buffer.byteLength(markdown, "utf8") > MAX_BYTES) {
    throw new ShareError("Markdown body exceeds 512 KB.", 413);
  }
  return markdown;
}

export async function publishDocument(
  store: ShareStore,
  markdown: unknown,
): Promise<SharedDocument> {
  const body = validateMarkdown(markdown);
  const now = new Date().toISOString();
  const doc: SharedDocument = {
    id: generateShareId(),
    markdown: body,
    title: await inferTitle(body),
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    settings: { access: "unlisted", allowPdf: true, allowMarkdownDownload: true },
  };
  await store.put(doc);
  return doc;
}

/** Replace the Markdown; the share ID and creation time are stable. */
export async function updateDocument(
  store: ShareStore,
  id: string,
  markdown: unknown,
): Promise<SharedDocument> {
  const existing = await store.get(id);
  if (!existing) throw new ShareError("Document not found.", 404);
  const body = validateMarkdown(markdown);
  const doc: SharedDocument = {
    ...existing,
    markdown: body,
    title: await inferTitle(body),
    updatedAt: new Date().toISOString(),
  };
  await store.put(doc);
  return doc;
}

export async function setRevoked(
  store: ShareStore,
  id: string,
  revoked: boolean,
): Promise<SharedDocument> {
  const existing = await store.get(id);
  if (!existing) throw new ShareError("Document not found.", 404);
  const doc: SharedDocument = {
    ...existing,
    revokedAt: revoked ? new Date().toISOString() : null,
  };
  await store.put(doc);
  return doc;
}

/**
 * Public read: unknown, malformed and revoked IDs all resolve to null so
 * callers return one uniform 404 and never reveal which case applied.
 */
export async function getPublicDocument(
  store: ShareStore,
  id: string,
): Promise<SharedDocument | null> {
  if (!isShareId(id)) return null;
  const doc = await store.get(id);
  if (!doc || doc.revokedAt) return null;
  return doc;
}
