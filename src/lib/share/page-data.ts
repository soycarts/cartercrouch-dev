import type { Metadata } from "next";
import type { VersionOption } from "@/components/share/VersionMenu";
import type { ReaderPageProps } from "@/components/share/ReaderPage";
import { getStore } from "./index";
import { renderDocument, renderHtml, type RenderedSection } from "./markdown";
import {
  documentFilename,
  findAttachment,
  getPublicDocument,
  getPublicVersion,
  type SharedDocument,
  type ShareStore,
} from "./store";
import {
  attachmentPageUrl,
  attachmentPdfUrl,
  attachmentUrl,
  markdownUrl,
  pdfUrl,
  readerUrl,
} from "./urls";
import { loadViewerAttachments } from "./viewer";

/**
 * Everything the reader pages need, built once for both the current document
 * and an archived draft. `/:id` and `/:id/:version` differ only in which
 * snapshot they hand this module; the page files below them are thin enough
 * to read at a glance, which is the point — six near-identical route files
 * would drift apart within a release.
 */

/** What is being read, and the live document it belongs to. */
export type ShareView = {
  /** The current document — the only place the draft history lives. */
  current: SharedDocument;
  /** What to render: `current` itself, or an archived snapshot of it. */
  doc: SharedDocument;
  /** The slug being read; null on the current draft. */
  slug: string | null;
};

/**
 * Resolve an id, and optionally a draft slug, to something renderable.
 * Unknown, malformed, revoked and never-archived all come back null, so
 * every miss is the same uniform 404.
 */
export async function loadShareView(
  id: string,
  slug?: string,
  store: ShareStore = getStore(),
): Promise<ShareView | null> {
  if (slug === undefined) {
    const current = await getPublicDocument(store, id);
    return current ? { current, doc: current, slug: null } : null;
  }
  const [current, snapshot] = await Promise.all([
    getPublicDocument(store, id),
    getPublicVersion(store, id, slug),
  ]);
  if (!current || !snapshot) return null;
  return { current, doc: snapshot, slug };
}

/** Where a given draft shows `file`, falling back to its main document. */
function hrefWithin(doc: SharedDocument, slug: string | null, file: string | null): string {
  if (file && findAttachment(doc, file)) return attachmentPageUrl(doc.id, file, slug);
  return readerUrl(doc.id, slug);
}

/**
 * The menu's entries, newest first: the live draft, then each archived one.
 * Reading a context file, an entry points at that same file in that draft
 * when it had one — the reader stays on the file they were looking at —
 * and at the draft's main document when it did not. That is the only case
 * that needs the snapshots themselves, so it is the only case that loads
 * them.
 */
async function versionOptions(
  view: ShareView,
  file: string | null,
  store: ShareStore,
): Promise<VersionOption[]> {
  const { current, slug } = view;
  const archived = [...(current.versions ?? [])].reverse();
  const label = current.version;
  const head: VersionOption[] = label
    ? [
        {
          label,
          href: hrefWithin(current, null, file),
          current: true,
          active: slug === null,
        },
      ]
    : [];
  const snapshots = file
    ? await Promise.all(archived.map((v) => store.getVersion(current.id, v.slug)))
    : archived.map(() => null);
  return [
    ...head,
    ...archived.map((v, i) => ({
      label: v.version,
      href:
        file && snapshots[i] && findAttachment(snapshots[i]!, file)
          ? attachmentPageUrl(current.id, file, v.slug)
          : readerUrl(current.id, v.slug),
      current: false,
      active: slug === v.slug,
    })),
  ];
}

/** The banner an archived page carries: when it was replaced, and by what. */
function superseded(view: ShareView, file: string | null) {
  if (!view.slug) return null;
  const entry = (view.current.versions ?? []).find((v) => v.slug === view.slug);
  if (!entry) return null;
  return { at: entry.supersededAt, currentHref: hrefWithin(view.current, null, file) };
}

/** True when the reader has any draft to choose between. */
function hasVersions(view: ShareView): boolean {
  return Boolean(view.current.version) || (view.current.versions ?? []).length > 0;
}

export type PrintProps = {
  kind: "print";
  title: string | null;
  createdAt: string;
  updatedAt: string;
  sections: RenderedSection[];
};

export type SharePageProps = PrintProps | { kind: "reader"; reader: ReaderPageProps };

/**
 * The document page: the styled reader, or — with `?print=1`, which is what
 * the PDF routes fetch — a bare print view of the document or one of its
 * context files. Returns null when `file` names nothing this draft has.
 */
export async function sharePageProps(
  view: ShareView,
  search: { view?: string; print?: string; file?: string },
  store: ShareStore = getStore(),
): Promise<SharePageProps | null> {
  const { doc, slug } = view;

  if (search.print === "1") {
    const target = search.file ? findAttachment(doc, search.file) : null;
    if (search.file && !target) return null;
    const rendered = await renderDocument(target ? target.markdown : doc.markdown);
    return {
      kind: "print",
      title: rendered.title ?? target?.name ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      sections: rendered.sections,
    };
  }

  const [rendered, html, files, versions] = await Promise.all([
    renderDocument(doc.markdown),
    renderHtml(doc.markdown),
    loadViewerAttachments(doc, slug),
    hasVersions(view) ? versionOptions(view, null, store) : Promise.resolve([]),
  ]);

  return {
    kind: "reader",
    reader: {
      title: rendered.title,
      href: readerUrl(doc.id, slug),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      toc: rendered.toc,
      doc: {
        sections: rendered.sections,
        html,
        markdown: doc.markdown,
        pdfUrl: pdfUrl(doc.id, slug),
        markdownUrl: markdownUrl(doc.id, slug),
      },
      initialView: search.view === "markdown" ? "markdown" : "reader",
      documentName: documentFilename(doc),
      documentHref: readerUrl(doc.id, slug),
      files,
      versionLabel: doc.version,
      versions,
      superseded: superseded(view, null),
    },
  };
}

/** A context file promoted to a page of its own, in whichever draft. */
export async function attachmentPageProps(
  view: ShareView,
  name: string,
  search: { view?: string },
  store: ShareStore = getStore(),
): Promise<ReaderPageProps | null> {
  const { doc, slug } = view;
  const file = findAttachment(doc, name);
  if (!file) return null;

  const [rendered, html, files, versions] = await Promise.all([
    renderDocument(file.markdown),
    renderHtml(file.markdown),
    loadViewerAttachments(doc, slug),
    hasVersions(view) ? versionOptions(view, file.name, store) : Promise.resolve([]),
  ]);

  return {
    title: rendered.title ?? file.name,
    href: attachmentPageUrl(doc.id, file.name, slug),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    toc: rendered.toc,
    doc: {
      sections: rendered.sections,
      html,
      markdown: file.markdown,
      pdfUrl: attachmentPdfUrl(doc.id, file.name, slug),
      markdownUrl: attachmentUrl(doc.id, file.name, slug),
    },
    initialView: search.view === "markdown" ? "markdown" : "reader",
    documentName: documentFilename(doc),
    documentHref: readerUrl(doc.id, slug),
    files,
    currentFile: file.name,
    versionLabel: doc.version,
    versions,
    superseded: superseded(view, file.name),
  };
}

const NOT_FOUND_METADATA: Metadata = {
  title: "Document not found",
  robots: { index: false, follow: false },
};

/**
 * One card for every reader page. `url` is the page's own address, so a
 * shared link previews what it actually opens; the canonical points at the
 * *current* draft, so an old one never competes with it for the same reader.
 */
function shareMetadata({
  title,
  description,
  url,
  canonical,
  createdAt,
  updatedAt,
}: {
  title: string;
  description: string | null;
  url: string;
  canonical: string;
  createdAt: string;
  updatedAt: string;
}): Metadata {
  return {
    title: `${title} — Carter / Share`,
    description: description ?? undefined,
    // Absolute URLs (the OG image above all) must be on the share host, not
    // the personal site's metadataBase from the root layout.
    metadataBase: new URL(new URL(url).origin),
    robots: { index: false, follow: false },
    alternates: { canonical },
    openGraph: {
      type: "article",
      url,
      title,
      description: description ?? undefined,
      siteName: "Carter / Share",
      locale: "en_US",
      publishedTime: createdAt,
      modifiedTime: updatedAt,
      authors: ["Carter Crouch"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
      creator: "@soycarts",
    },
  };
}

export async function documentMetadata(view: ShareView | null): Promise<Metadata> {
  if (!view) return NOT_FOUND_METADATA;
  const { doc, slug } = view;
  const { title, description } = await renderDocument(doc.markdown);
  return shareMetadata({
    title: title ?? "Untitled document",
    description,
    url: readerUrl(doc.id, slug),
    canonical: readerUrl(doc.id),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

export async function attachmentMetadata(
  view: ShareView | null,
  name: string,
): Promise<Metadata> {
  const file = view ? findAttachment(view.doc, name) : null;
  if (!view || !file) return NOT_FOUND_METADATA;
  const { doc, slug } = view;
  const { title, description } = await renderDocument(file.markdown);
  return shareMetadata({
    title: title ?? file.name,
    description,
    url: attachmentPageUrl(doc.id, file.name, slug),
    // An old draft points at the live one — at the same file when it is
    // still there, and at the document itself when that draft dropped it.
    canonical: hrefWithin(view.current, null, file.name),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
