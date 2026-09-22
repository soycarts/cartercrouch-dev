import { cache } from "react";
import type { Metadata } from "next";
import type { VersionOption } from "@/components/share/VersionMenu";
import type { ReaderPageProps } from "@/components/share/ReaderPage";
import { getStore } from "./index";
import { documentDiff, type DocumentDiff } from "./diff";
import { renderDocument, renderHtml, type RenderedSection } from "./markdown";
import {
  documentFilename,
  findAttachment,
  getPublicDocument,
  isVersionSlug,
  publicShape,
  type Attachment,
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
 * Every reader page is rendered twice per request — once for
 * generateMetadata, once for the page itself — and an archived page reads
 * two blobs, either of which can be hundreds of kilobytes. React's `cache`
 * makes both passes share one read of each. It memoises per request, so
 * nothing leaks between readers; a test that passes its own store opts out.
 */
const cachedCurrent = cache((id: string) => getPublicDocument(getStore(), id));
const cachedSnapshot = cache((id: string, slug: string) => getStore().getVersion(id, slug));

/**
 * Resolve an id, and optionally a draft slug, to something renderable.
 * Unknown, malformed, revoked and never-archived all come back null, so
 * every miss is the same uniform 404. A slug the current document does not
 * list is never served, however real the blob behind it looks: see
 * publicVersionOf.
 */
export async function loadShareView(
  id: string,
  slug?: string,
  store?: ShareStore,
): Promise<ShareView | null> {
  const current = store ? await getPublicDocument(store, id) : await cachedCurrent(id);
  if (!current) return null;
  if (slug === undefined) return { current, doc: current, slug: null };
  if (!isVersionSlug(slug)) return null;
  if (!(current.versions ?? []).some((v) => v.slug === slug)) return null;
  const snapshot = store
    ? await store.getVersion(id, slug)
    : await cachedSnapshot(id, slug);
  if (!snapshot) return null;
  return { current, doc: { ...publicShape(snapshot), versions: [] }, slug };
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
 * and at the draft's main document when it did not.
 *
 * Which files a draft had is answered from the names recorded on the entry,
 * never by fetching the draft. Fetching them cost a full read of every
 * snapshot on every attachment page view: a document with twelve drafts and
 * a 165 KB body was pulling 2.7 MB out of Redis to decide twelve hrefs.
 * Entries written before those names were recorded say nothing, so their
 * item points at that draft's document — the safe direction.
 */
function versionOptions(view: ShareView, file: string | null): VersionOption[] {
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
  const hasFile = (v: (typeof archived)[number]) =>
    file !== null &&
    (v.attachments ?? []).some((name) => name.toLowerCase() === file.toLowerCase());
  return [
    ...head,
    ...archived.map((v) => ({
      label: v.version,
      href: hasFile(v)
        ? attachmentPageUrl(current.id, file!, v.slug)
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

/**
 * True when there is a *choice* to offer. A labelled document with nothing
 * archived yet has exactly one draft, and a menu with one entry is chrome
 * that does nothing.
 */
function hasVersions(view: ShareView): boolean {
  return (view.current.versions ?? []).length > 0;
}

/**
 * "Diff vs live" for what this page shows — but only when the reader asked
 * for it, and never on the current draft, which has nothing to compare
 * against.
 *
 * It is gated on `?diff=1` because it is not free. Both sides are already
 * in memory, so it costs no fetch, but the comparison itself is two
 * O(N × D) diffs over documents of up to 900 KB, and it was being computed
 * and serialised into the HTML of every archived page view — most of which
 * never show it. The toggle navigates to `?diff=1` when the page it is on
 * arrived without one; from then on it is a local switch, because both
 * representations are in the props.
 *
 * `file` is the context file being read, if any. A file the current draft no
 * longer carries diffs against nothing, which reads as a full removal —
 * which is what happened to it.
 */
async function viewDiff(
  view: ShareView,
  file: Attachment | null,
  search: { diff?: string },
): Promise<DocumentDiff | undefined> {
  if (!view.slug || search.diff !== "1") return undefined;
  const live = file
    ? (findAttachment(view.current, file.name)?.markdown ?? null)
    : view.current.markdown;
  return documentDiff({
    archived: file ? file.markdown : view.doc.markdown,
    live,
    liveLabel: view.current.version ?? "current",
  });
}

/** `?diff=1`, honoured only where there is a live draft to compare with. */
function initialDiff(view: ShareView, search: { diff?: string }): boolean {
  return view.slug !== null && search.diff === "1";
}

/**
 * The header's diff control on an archived page: whether the diff is on, and
 * the link that flips it. The comparison is computed only for `?diff=1`, so
 * flipping it is a navigation either way, and the link carries the reading
 * mode along so the page comes back in the mode it left.
 */
function diffLink(
  view: ShareView,
  file: string | null,
  search: { diff?: string; view?: string },
): { on: boolean; href: string } | null {
  if (!view.slug) return null;
  const on = search.diff === "1";
  const base = hrefWithin(view.current, view.slug, file);
  const params = new URLSearchParams();
  if (!on) params.set("diff", "1");
  if (search.view === "markdown") params.set("view", "markdown");
  const query = params.toString();
  return { on, href: query ? `${base}?${query}` : base };
}

export type PrintProps = {
  kind: "print";
  title: string | null;
  createdAt: string;
  updatedAt: string;
  sections: RenderedSection[];
  /** The draft this page is, and — when archived — that it is not current.
   *  A printed page travels on its own: nothing else on it says so. */
  versionLabel: string | null;
  superseded: { at: string; currentHref: string } | null;
};

export type SharePageProps = PrintProps | { kind: "reader"; reader: ReaderPageProps };

/**
 * The document page: the styled reader, or — with `?print=1`, which is what
 * the PDF routes fetch — a bare print view of the document or one of its
 * context files. Returns null when `file` names nothing this draft has.
 */
export async function sharePageProps(
  view: ShareView,
  search: { view?: string; print?: string; file?: string; diff?: string },
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
      versionLabel: doc.version,
      superseded: superseded(view, target?.name ?? null),
    };
  }

  const [rendered, html, files, diff] = await Promise.all([
    renderDocument(doc.markdown),
    renderHtml(doc.markdown),
    loadViewerAttachments(doc, slug),
    viewDiff(view, null, search),
  ]);
  const versions = hasVersions(view) ? versionOptions(view, null) : [];

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
        diff,
      },
      initialView: search.view === "markdown" ? "markdown" : "reader",
      initialDiff: initialDiff(view, search),
      diffLink: diffLink(view, null, search),
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
  search: { view?: string; diff?: string },
): Promise<ReaderPageProps | null> {
  const { doc, slug } = view;
  const file = findAttachment(doc, name);
  if (!file) return null;

  const [rendered, html, files, diff] = await Promise.all([
    renderDocument(file.markdown),
    renderHtml(file.markdown),
    loadViewerAttachments(doc, slug),
    viewDiff(view, file, search),
  ]);
  const versions = hasVersions(view) ? versionOptions(view, file.name) : [];

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
      diff,
    },
    initialView: search.view === "markdown" ? "markdown" : "reader",
    initialDiff: initialDiff(view, search),
    diffLink: diffLink(view, file.name, search),
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
