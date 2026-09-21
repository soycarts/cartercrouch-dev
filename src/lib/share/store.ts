import { generateShareId, isShareId } from "./ids";
import { inferTitle } from "./markdown";
import { downloadFilename, markdownUrl, pdfUrl, readerUrl } from "./urls";

/** A context file shared alongside the document. Markdown only. */
export type Attachment = {
  name: string;
  markdown: string;
};

/**
 * An archived draft: the label the owner gave it, the slug its URLs hang
 * off, when that draft was last written, and when a newer one replaced it.
 * Stored oldest first on the current document.
 */
export type DocumentVersion = {
  version: string;
  slug: string;
  publishedAt: string;
  supersededAt: string;
};

export type SharedDocument = {
  id: string;
  /** The canonical Markdown, byte-for-byte as published. */
  markdown: string;
  attachments: Attachment[];
  /** The owner's label for this draft, e.g. "1.1". Null before versioning. */
  version: string | null;
  /** Archived drafts, oldest first. Always empty on a snapshot. */
  versions: DocumentVersion[];
  /** Inferred from the first H1. */
  title: string | null;
  /** Owner-chosen filename (ending in .md); null means derive from the title. */
  filename: string | null;
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
  /** An archived draft, whole. Snapshots are immutable once written. */
  getVersion(id: string, slug: string): Promise<SharedDocument | null>;
  putVersion(id: string, slug: string, doc: SharedDocument): Promise<void>;
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

/**
 * Version slugs are their own URL segment, sitting where `files`, `md` and
 * `pdf` also live: `/:id/draft1_0`. The "draft" prefix is what keeps those
 * three out of the namespace — none of them can ever match this pattern —
 * so the reserved words never have to be listed anywhere.
 */
export const VERSION_SLUG = /^draft[0-9A-Za-z]+(?:_[0-9A-Za-z]+)*$/;

export function isVersionSlug(value: string): boolean {
  return VERSION_SLUG.test(value);
}

/** "1.0" -> "draft1_0". Anything that is not a letter or digit becomes "_". */
export function versionSlug(label: string): string {
  return "draft" + label.replace(/[^0-9A-Za-z]+/g, "_");
}

const MAX_VERSION_LABEL = 32;

/**
 * A label is only usable if the slug it produces is routable — "…1.0." would
 * become "draft1_0_", which no URL can reach — so the round trip is the
 * validation. Absent input stays absent; the caller decides what that means.
 */
function validateVersionLabel(input: unknown, field = "version"): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") throw new ShareError(`The ${field} must be text.`, 400);
  const label = input.trim();
  if (!label) return null;
  if (label.length > MAX_VERSION_LABEL) {
    throw new ShareError(`A ${field} label is at most ${MAX_VERSION_LABEL} characters.`, 400);
  }
  if (!isVersionSlug(versionSlug(label))) {
    throw new ShareError(
      `"${label}" is not a usable ${field} label — start it with a letter or digit.`,
      400,
    );
  }
  return label;
}

/**
 * The label a pre-versioning document was already carrying in its own prose:
 * a "***Draft:*** 1.0" line near the top, which is how these documents have
 * been marked up by hand until now. Read once, when the first bump needs a
 * name for the draft it is archiving.
 */
export function inferVersionLabel(markdown: string): string | null {
  const head = markdown.split("\n", 20).join("\n");
  const match = /^\*{0,3}Draft:?\*{0,3}\s*([0-9][0-9A-Za-z.]*)/m.exec(head);
  if (!match) return null;
  const label = match[1];
  return isVersionSlug(versionSlug(label)) ? label : null;
}

export type DocumentInput = {
  markdown: unknown;
  attachments?: unknown;
  filename?: unknown;
  /** The label for the draft being written, e.g. "1.1". */
  version?: unknown;
  /** The label the *existing* draft should be archived under, when the
   *  stored document predates versioning and its Markdown does not say. */
  previousVersion?: unknown;
};

function validateFilename(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") throw new ShareError("Filename must be text.", 400);
  const name = input.trim();
  if (!name) return null;
  if (!ATTACHMENT_NAME.test(name)) {
    throw new ShareError(`"${name}" is not a valid .md filename.`, 400);
  }
  return name;
}

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

function validateInput(input: DocumentInput): {
  markdown: string;
  attachments: Attachment[];
  filename: string | null;
} {
  const markdown = validateMarkdown(input.markdown);
  const attachments = validateAttachments(input.attachments);
  const filename = validateFilename(input.filename);
  if (filename && attachments.some((a) => a.name.toLowerCase() === filename.toLowerCase())) {
    throw new ShareError(`An attachment is also named "${filename}".`, 400);
  }
  const total = attachments.reduce(
    (n, a) => n + Buffer.byteLength(a.markdown, "utf8"),
    Buffer.byteLength(markdown, "utf8"),
  );
  if (total > MAX_TOTAL_BYTES) {
    throw new ShareError("Document plus attachments exceed 900 KB.", 413);
  }
  return { markdown, attachments, filename };
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
  const { markdown: body, attachments, filename } = validateInput(input);
  const now = new Date().toISOString();
  const doc: SharedDocument = {
    id: generateShareId(),
    markdown: body,
    attachments,
    version: validateVersionLabel(input.version),
    versions: [],
    title: await inferTitle(body),
    filename,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    settings: { access: "unlisted", allowPdf: true, allowMarkdownDownload: true },
  };
  await store.put(doc);
  return doc;
}

/**
 * Replace the Markdown; the share ID and creation time are stable.
 *
 * With a `version` label that differs from the one already stored, the
 * outgoing draft is first copied whole to its own slug, where its URLs keep
 * working forever, and recorded in `versions`. The same label — or none —
 * overwrites in place, which is what an edit to the draft you are on should
 * do. Nothing here ever rewrites or deletes a snapshot.
 */
export async function updateDocument(
  store: ShareStore,
  id: string,
  input: DocumentInput,
): Promise<SharedDocument> {
  const existing = await store.get(id);
  if (!existing) throw new ShareError("Document not found.", 404);
  const { markdown: body, attachments, filename } = validateInput(input);
  const nextLabel = validateVersionLabel(input.version);
  const previousLabel = validateVersionLabel(input.previousVersion, "previousVersion");
  const existingLabel = existing.version ?? null;
  const now = new Date().toISOString();

  let version = existingLabel;
  let versions = existing.versions ?? [];

  if (nextLabel !== null && nextLabel !== existingLabel) {
    // What to call the draft being retired. A document published before
    // versioning has no label of its own: take the owner's word for it, or
    // read the "Draft: X" line it was already carrying.
    const outgoing = existingLabel ?? previousLabel ?? inferVersionLabel(existing.markdown);
    if (!outgoing) {
      throw new ShareError("Existing document has no version; pass previousVersion.", 400);
    }
    const slug = versionSlug(outgoing);
    const taken = versions.some((v) => v.slug === slug) || (await store.getVersion(id, slug));
    if (taken) {
      throw new ShareError(`Draft "${outgoing}" is already archived.`, 409);
    }
    await store.putVersion(id, slug, {
      ...existing,
      attachments: existing.attachments ?? [],
      filename: existing.filename ?? null,
      version: outgoing,
      // A snapshot is a leaf: the version list lives on the current document.
      versions: [],
    });
    versions = [
      ...versions,
      { version: outgoing, slug, publishedAt: existing.updatedAt, supersededAt: now },
    ];
    version = nextLabel;
  } else if (nextLabel !== null) {
    version = nextLabel;
  }

  const doc: SharedDocument = {
    ...existing,
    markdown: body,
    attachments,
    version,
    versions,
    title: await inferTitle(body),
    filename,
    updatedAt: now,
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
  return publicShape(doc);
}

/**
 * The same read for an archived draft. A missing parent, a revoked one, a
 * slug that is not a slug, and a snapshot that was never written all resolve
 * to null, so an old draft 404s exactly the way the current one does.
 */
export async function getPublicVersion(
  store: ShareStore,
  id: string,
  slug: string,
): Promise<SharedDocument | null> {
  if (!isShareId(id) || !isVersionSlug(slug)) return null;
  const parent = await store.get(id);
  if (!parent || parent.revokedAt) return null;
  const snapshot = await store.getVersion(id, slug);
  if (!snapshot) return null;
  return { ...publicShape(snapshot), versions: [] };
}

/** Fields added after the first documents were stored read as their empty
 *  value, so a blob written before this release still renders. */
function publicShape(doc: SharedDocument): SharedDocument {
  return {
    ...doc,
    attachments: doc.attachments ?? [],
    filename: doc.filename ?? null,
    version: doc.version ?? null,
    versions: doc.versions ?? [],
  };
}

/** The public URLs of every archived draft, in the API's response shape. */
export function versionLinks(doc: SharedDocument) {
  return (doc.versions ?? []).map((v) => ({
    version: v.version,
    slug: v.slug,
    url: readerUrl(doc.id, v.slug),
    markdownUrl: markdownUrl(doc.id, v.slug),
    pdfUrl: pdfUrl(doc.id, v.slug),
  }));
}

/** The document's own filename: chosen by the owner, else derived from the title. */
export function documentFilename(doc: SharedDocument, ext: "md" | "pdf" = "md"): string {
  if (doc.filename) return ext === "md" ? doc.filename : doc.filename.replace(/\.md$/i, ".pdf");
  return downloadFilename(doc.title, doc.id, ext);
}

export function findAttachment(doc: SharedDocument, name: string): Attachment | null {
  const key = name.toLowerCase();
  return (doc.attachments ?? []).find((a) => a.name.toLowerCase() === key) ?? null;
}
