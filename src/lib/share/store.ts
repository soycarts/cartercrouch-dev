import { generateShareId, isShareId } from "./ids";
import { inferTitle } from "./markdown";

/** A context file shared alongside the document. Markdown only. */
export type Attachment = {
  name: string;
  markdown: string;
};

export type SharedDocument = {
  id: string;
  /** The canonical Markdown, byte-for-byte as published. */
  markdown: string;
  attachments: Attachment[];
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
const MAX_TOTAL_BYTES = 900 * 1024; // one Redis value holds the lot
const MAX_ATTACHMENTS = 20;
export const ATTACHMENT_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,78}\.md$/;

export type DocumentInput = {
  markdown: unknown;
  attachments?: unknown;
};

function validateAttachments(input: unknown): Attachment[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new ShareError("Attachments must be a list.", 400);
  if (input.length > MAX_ATTACHMENTS) {
    throw new ShareError(`At most ${MAX_ATTACHMENTS} attachments.`, 400);
  }
  const seen = new Set<string>();
  return input.map((raw) => {
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    if (!ATTACHMENT_NAME.test(name)) {
      throw new ShareError(`"${name || "?"}" is not a valid .md filename.`, 400);
    }
    const key = name.toLowerCase();
    if (seen.has(key)) throw new ShareError(`Duplicate attachment "${name}".`, 400);
    seen.add(key);
    if (typeof raw.markdown !== "string" || Buffer.byteLength(raw.markdown, "utf8") > MAX_BYTES) {
      throw new ShareError(`"${name}" is empty or exceeds 512 KB.`, 413);
    }
    return { name, markdown: raw.markdown };
  });
}

function validateInput(input: DocumentInput): { markdown: string; attachments: Attachment[] } {
  const markdown = validateMarkdown(input.markdown);
  const attachments = validateAttachments(input.attachments);
  const total = attachments.reduce(
    (n, a) => n + Buffer.byteLength(a.markdown, "utf8"),
    Buffer.byteLength(markdown, "utf8"),
  );
  if (total > MAX_TOTAL_BYTES) {
    throw new ShareError("Document plus attachments exceed 900 KB.", 413);
  }
  return { markdown, attachments };
}

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
  input: DocumentInput,
): Promise<SharedDocument> {
  const { markdown: body, attachments } = validateInput(input);
  const now = new Date().toISOString();
  const doc: SharedDocument = {
    id: generateShareId(),
    markdown: body,
    attachments,
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
  input: DocumentInput,
): Promise<SharedDocument> {
  const existing = await store.get(id);
  if (!existing) throw new ShareError("Document not found.", 404);
  const { markdown: body, attachments } = validateInput(input);
  const doc: SharedDocument = {
    ...existing,
    markdown: body,
    attachments,
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
  return { ...doc, attachments: doc.attachments ?? [] };
}

export function findAttachment(doc: SharedDocument, name: string): Attachment | null {
  const key = name.toLowerCase();
  return (doc.attachments ?? []).find((a) => a.name.toLowerCase() === key) ?? null;
}
